import { createRentalOrderCore, type RentalCreatePayload } from "@/app/features/rentals/api/create-rental-order-core";
import { signOrderAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
import { approveNicePaymentByTid, cancelNicePaymentByTid, extractNiceCardInfo, extractNiceEasyPayProvider } from "@/lib/payments/nice/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions, type TossPaymentFailureStage } from "@/lib/payments/toss/session";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

function pick(raw: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function toAmount(value: string) {
  const amount = Math.floor(Number(value || 0));
  return Number.isFinite(amount) ? amount : 0;
}

function toFailUrl(code: string, message?: string, options?: { racketId?: string }) {
  const qs = new URLSearchParams({ code });
  if (message) qs.set("message", message);
  if (options?.racketId) qs.set("racketId", options.racketId);
  return `/rentals/nice/fail?${qs.toString()}`;
}

async function parseRequestPayload(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const obj: Record<string, string> = {};
    for (const [k, v] of formData.entries()) obj[k] = typeof v === "string" ? v : "";
    return obj;
  }
  if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.entries(json).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
      return acc;
    }, {});
  }
  const text = await req.text().catch(() => "");
  if (text.trim()) return Object.fromEntries(new URLSearchParams(text));
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (obj[k] = v));
  return obj;
}

function getApproveCredentials() {
  const clientKey = String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
  const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();
  return { clientKey, secretKey };
}

function getApproveApiBase() {
  return String(process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments").trim().replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const raw = await parseRequestPayload(req);
    const authResultCode = pick(raw, "authResultCode", "AuthResultCode");
    const authResultMsg = pick(raw, "authResultMsg", "AuthResultMsg");
    const tid = pick(raw, "tid", "TID", "TxTid");
    const clientId = pick(raw, "clientId", "ClientId", "CID");
    const orderId = pick(raw, "orderId", "OrderId", "MOID", "Moid");
    const amount = toAmount(pick(raw, "amount", "Amt"));
    const authToken = pick(raw, "authToken", "AuthToken");
    const signature = pick(raw, "signature", "Signature");

    if (!orderId) return NextResponse.redirect(new URL(toFailUrl("INVALID_QUERY", "orderId 값이 누락되었습니다."), req.url));

    const client = await clientPromise;
    const db = client.db();
    await ensureTossPaymentSessionIndexes(db);
    const col = tossPaymentSessions(db);
    const session = await col.findOne({ niceOrderId: orderId });
    if (!session) return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "결제 세션을 찾을 수 없습니다."), req.url));

    const failOptions = {
      racketId:
        typeof (session.rentalPayload as { racketId?: unknown } | undefined)?.racketId === "string"
          ? (session.rentalPayload as { racketId?: string }).racketId
          : undefined,
    };
    if (session.provider !== "nicepay" || session.flowType !== "rental_order") {
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "라켓 대여 Nice 결제 세션이 아닙니다.", failOptions), req.url));
    }
    if (session.status === "approved" && session.mongoOrderId) {
      return NextResponse.redirect(new URL(`/rentals/success?id=${encodeURIComponent(session.mongoOrderId)}`, req.url));
    }

    const now = new Date();
    if (session.expiresAt && session.expiresAt.getTime() < now.getTime()) {
      await col.updateOne({ _id: session._id }, { $set: { status: "failed", failureStage: "session_expired_before_confirm", failureCode: "SESSION_EXPIRED", failureMessage: "결제 세션 유효시간이 만료되었습니다.", updatedAt: now } });
      return NextResponse.redirect(new URL(toFailUrl("SESSION_EXPIRED", "결제 세션 유효시간이 만료되었습니다.", failOptions), req.url));
    }

    const markFailure = async (stage: TossPaymentFailureStage, code: string, message: string, includeApproveRaw?: Record<string, string>) => {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: stage,
            failureCode: code,
            failureMessage: message,
            niceAuthRaw: raw,
            ...(includeApproveRaw ? { niceApprovedRaw: includeApproveRaw } : {}),
            updatedAt: new Date(),
          },
        },
      );
    };

    if (authResultCode !== "0000") {
      await markFailure("verify_auth", "AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다.");
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다.", failOptions), req.url));
    }

    const prepared = session.nicePrepared || { clientId: "", orderId: "" };
    if (!tid || !authToken || !signature || !clientId || !prepared.clientId || clientId !== prepared.clientId) {
      await markFailure("verify_auth", "AUTH_FAILED", "인증 응답 필수값 검증에 실패했습니다.");
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", "인증 응답 필수값 검증에 실패했습니다.", failOptions), req.url));
    }

    if (!Number.isFinite(amount) || amount <= 0 || session.amount !== amount || prepared.orderId !== orderId) {
      await markFailure("verify_auth", "AMOUNT_MISMATCH", "결제 금액 검증에 실패했습니다.");
      return NextResponse.redirect(new URL(toFailUrl("AMOUNT_MISMATCH", "결제 금액 검증에 실패했습니다.", failOptions), req.url));
    }

    const { clientKey, secretKey } = getApproveCredentials();
    const approveApiBase = getApproveApiBase();
    if (!clientKey || !secretKey) {
      await markFailure("approve_payment", "APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다.");
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다.", failOptions), req.url));
    }

    let approvedRaw: Record<string, string>;
    try {
      approvedRaw = await approveNicePaymentByTid({ tid, amount, clientKey, secretKey, apiBaseUrl: approveApiBase });
    } catch (error: any) {
      await markFailure("approve_payment", "APPROVE_FAILED", error?.message || "승인 처리에 실패했습니다.");
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "승인 처리에 실패했습니다.", failOptions), req.url));
    }

    const approveResultCode = pick(approvedRaw, "resultCode", "ResultCode");
    if (approveResultCode !== "0000") {
      const message = pick(approvedRaw, "resultMsg", "ResultMsg") || "승인 처리에 실패했습니다.";
      await markFailure("approve_payment", "APPROVE_FAILED", message, approvedRaw);
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", message, failOptions), req.url));
    }

    const rentalPayload = session.rentalPayload as RentalCreatePayload | undefined;
    if (!rentalPayload?.racketId || !rentalPayload?.days) {
      await col.updateOne({ _id: session._id }, { $set: { status: "approve_succeeded_order_failed", failureStage: "create_order_after_approve", failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", failureMessage: "결제 승인 후 대여 데이터를 복원하지 못했습니다.", niceAuthRaw: raw, niceApprovedRaw: approvedRaw, updatedAt: new Date() } });
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "결제 승인 후 주문 처리에 실패했습니다.", failOptions), req.url));
    }

    try {
      const card = extractNiceCardInfo(approvedRaw);
      const easyPayProvider = extractNiceEasyPayProvider(approvedRaw);
      const rental = await createRentalOrderCore({
        db,
        client,
        userObjectId: session.userId && ObjectId.isValid(session.userId) ? new ObjectId(session.userId) : null,
        payload: {
          ...rentalPayload,
          payment: { method: "nicepay" },
        },
        idemKey: `nice:rental:${orderId}`,
        initialStatus: "paid",
        paidMetadata: {
          paidAt: new Date(),
          paymentStatus: "결제완료",
          paymentInfo: {
            status: "결제완료",
            provider: "nicepay",
            method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
            tid,
            approvedAt: pick(approvedRaw, "approvedAt", "authDate") || new Date().toISOString(),
            easyPayProvider: easyPayProvider || undefined,
            cardDisplayName: card?.displayName ?? undefined,
            cardCompany: card?.issuerName ?? card?.acquirerName ?? undefined,
            cardLabel: card?.cardName ?? card?.displayName ?? undefined,
            rawSummary: {
              orderId,
              totalAmount: amount,
            },
          },
        },
      });

      await col.updateOne({ _id: session._id }, { $set: { status: "approved", mongoOrderId: rental.id, paymentKey: tid, niceAuthRaw: raw, niceApprovedRaw: approvedRaw, updatedAt: new Date() } });

      const redirectUrl = new URL(`/rentals/success?id=${encodeURIComponent(rental.id)}`, req.url);
      const res = NextResponse.redirect(redirectUrl);
      if (!session.userId) {
        const token = signOrderAccessToken({ rentalId: rental.id });
        res.cookies.set("orderAccessToken", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
      return res;
    } catch (orderError: any) {
      const failureMessage = orderError?.message || "결제 승인 후 주문 생성에 실패했습니다.";
      try {
        const canceled = await cancelNicePaymentByTid({ tid, orderId, reason: "승인 후 내부 주문 생성 실패로 자동 취소", clientKey, secretKey, apiBaseUrl: approveApiBase });
        const cancelCode = pick(canceled, "resultCode", "ResultCode");
        const cancelMsg = pick(canceled, "resultMsg", "ResultMsg");
        const canceledOk = cancelCode === "0000";
        await col.updateOne({ _id: session._id }, { $set: { status: canceledOk ? "approve_succeeded_auto_cancel_succeeded" : "approve_succeeded_auto_cancel_failed", failureStage: "create_order_after_approve", failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", failureMessage, niceAuthRaw: raw, niceApprovedRaw: approvedRaw, updatedAt: new Date(), niceAutoCancel: { attemptedAt: new Date(), resultCode: cancelCode || "UNKNOWN", resultMsg: cancelMsg || undefined, status: canceledOk ? "succeeded" : "failed" } } });
      } catch (cancelError: any) {
        await col.updateOne({ _id: session._id }, { $set: { status: "approve_succeeded_auto_cancel_failed", failureStage: "create_order_after_approve", failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", failureMessage, niceAuthRaw: raw, niceApprovedRaw: approvedRaw, updatedAt: new Date(), niceAutoCancel: { attemptedAt: new Date(), resultCode: String(cancelError?.resultCode || cancelError?.code || "AUTO_CANCEL_REQUEST_ERROR"), resultMsg: cancelError?.message || "자동 취소 중 오류가 발생했습니다.", status: "failed" } } });
      }
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", failureMessage, failOptions), req.url));
    }
  } catch (error: any) {
    return NextResponse.redirect(new URL(toFailUrl("SERVER_ERROR", error?.message || "결제 처리 중 오류가 발생했습니다."), req.url));
  }
}

export async function GET(req: Request) {
  return POST(req);
}
