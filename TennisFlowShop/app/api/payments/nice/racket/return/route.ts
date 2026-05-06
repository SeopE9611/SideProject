import { createOrder } from "@/app/features/orders/api/handlers";
import clientPromise from "@/lib/mongodb";
import {
  approveNicePaymentByTid,
  cancelNicePaymentByTid,
  extractNiceCardInfo,
  extractNiceEasyPayProvider,
} from "@/lib/payments/nice/server";
import {
  ensureTossPaymentSessionIndexes,
  tossPaymentSessions,
  type TossPaymentFailureStage,
} from "@/lib/payments/toss/session";
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

function toFailUrl(code: string, message?: string, fallback?: string) {
  const qs = new URLSearchParams({ code });
  if (message) qs.set("message", message);
  if (fallback) qs.set("fallback", fallback);
  return `/rackets/nice/fail?${qs.toString()}`;
}

function toAmount(value: string) {
  const amount = Math.floor(Number(value || 0));
  return Number.isFinite(amount) ? amount : 0;
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

  if (req.method.toUpperCase() === "POST") {
    const text = await req.text().catch(() => "");
    if (text.trim()) return Object.fromEntries(new URLSearchParams(text));
  }

  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

function getApproveCredentials() {
  const clientKey = String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
  const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();
  return { clientKey, secretKey };
}

function getApproveApiBase() {
  return String(process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments")
    .trim()
    .replace(/\/+$/, "");
}

async function handleNiceRacketReturn(req: Request) {
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

    if (!orderId) {
      return NextResponse.redirect(new URL(toFailUrl("INVALID_QUERY", "orderId 값이 누락되었습니다."), req.url));
    }

    const client = await clientPromise;
    const db = client.db();
    await ensureTossPaymentSessionIndexes(db);
    const col = tossPaymentSessions(db);

    const session = await col.findOne({ niceOrderId: orderId });
    if (!session) {
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "결제 세션을 찾을 수 없습니다."), req.url));
    }

    const fallbackPath = session.racketPayload?.racketId
      ? `/rackets/${encodeURIComponent(session.racketPayload.racketId)}/purchase?recovery=1`
      : "/rackets";

    if (session.provider !== "nicepay" || session.flowType !== "racket_order") {
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "라켓 Nice 결제 세션이 아닙니다.", fallbackPath), req.url));
    }

    if (session.status === "approved" && session.mongoOrderId) {
      return NextResponse.redirect(
        new URL(`/racket-orders/${encodeURIComponent(session.mongoOrderId)}/select-string`, req.url),
      );
    }

    if (session.status === "approve_succeeded_order_failed") {
      return NextResponse.redirect(
        new URL(
          toFailUrl(
            "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
            session.failureMessage || "승인 이후 주문 처리 실패 상태입니다.",
            fallbackPath,
          ),
          req.url,
        ),
      );
    }

    const now = new Date();
    if (session.expiresAt && session.expiresAt.getTime() < now.getTime()) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "session_expired_before_confirm",
            failureCode: "SESSION_EXPIRED",
            failureMessage: "결제 세션 유효시간이 만료되었습니다.",
            updatedAt: now,
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("SESSION_EXPIRED", "결제 세션 유효시간이 만료되었습니다.", fallbackPath), req.url));
    }

    const markFailure = async (params: {
      stage: TossPaymentFailureStage;
      code: string;
      message: string;
      includeApproveRaw?: Record<string, string>;
    }) => {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: params.stage,
            failureCode: params.code,
            failureMessage: params.message,
            niceAuthRaw: raw,
            ...(params.includeApproveRaw ? { niceApprovedRaw: params.includeApproveRaw } : {}),
            updatedAt: new Date(),
          },
        },
      );
    };

    if (authResultCode !== "0000") {
      await markFailure({ stage: "verify_auth", code: "AUTH_FAILED", message: authResultMsg || "인증 결제에 실패했습니다." });
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다.", fallbackPath), req.url));
    }

    const prepared = session.nicePrepared || { clientId: "", orderId: "" };
    if (!tid || !authToken || !signature || !clientId || !prepared.clientId || clientId !== prepared.clientId) {
      await markFailure({ stage: "verify_auth", code: "AUTH_FAILED", message: "인증 응답 필수값 검증에 실패했습니다." });
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", "인증 응답 필수값 검증에 실패했습니다.", fallbackPath), req.url));
    }

    if (!Number.isFinite(amount) || amount <= 0 || session.amount !== amount || prepared.orderId !== orderId) {
      await markFailure({ stage: "verify_auth", code: "AMOUNT_MISMATCH", message: "결제 금액 검증에 실패했습니다." });
      return NextResponse.redirect(new URL(toFailUrl("AMOUNT_MISMATCH", "결제 금액 검증에 실패했습니다.", fallbackPath), req.url));
    }

    const { clientKey, secretKey } = getApproveCredentials();
    const approveApiBase = getApproveApiBase();
    if (!clientKey || !secretKey) {
      await markFailure({ stage: "approve_payment", code: "APPROVE_FAILED", message: "결제 승인 설정이 올바르지 않습니다." });
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다.", fallbackPath), req.url));
    }

    let approvedRaw: Record<string, string>;
    try {
      approvedRaw = await approveNicePaymentByTid({
        tid,
        amount,
        clientKey,
        secretKey,
        apiBaseUrl: approveApiBase,
      });
    } catch (error: any) {
      await markFailure({ stage: "approve_payment", code: "APPROVE_FAILED", message: error?.message || "승인 처리에 실패했습니다." });
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "승인 처리에 실패했습니다.", fallbackPath), req.url));
    }

    const approveResultCode = pick(approvedRaw, "resultCode", "ResultCode");
    if (approveResultCode !== "0000") {
      const message = pick(approvedRaw, "resultMsg", "ResultMsg") || "승인 처리에 실패했습니다.";
      await markFailure({ stage: "approve_payment", code: "APPROVE_FAILED", message, includeApproveRaw: approvedRaw });
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", message, fallbackPath), req.url));
    }

    const racketPayload = session.racketPayload;
    if (!racketPayload?.racketId || !Array.isArray(racketPayload.items) || !racketPayload.shippingInfo) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "approve_succeeded_order_failed",
            failureStage: "create_order_after_approve",
            failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
            failureMessage: "결제 승인 후 라켓 주문 데이터를 복원하지 못했습니다.",
            niceAuthRaw: raw,
            niceApprovedRaw: approvedRaw,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(
        new URL(
          toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "결제 승인 후 주문 처리에 실패했습니다.", fallbackPath),
          req.url,
        ),
      );
    }

    const createOrderPayload = {
      items: racketPayload.items,
      shippingInfo: racketPayload.shippingInfo,
      totalPrice: racketPayload.totalPrice,
      shippingFee: racketPayload.shippingFee,
      paymentInfo: racketPayload.paymentInfo,
      servicePickupMethod: racketPayload.servicePickupMethod,
      guestInfo: racketPayload.guestInfo ?? undefined,
    };

    const tryAutoCancelAfterApprove = async (failureMessage: string, failureStage: TossPaymentFailureStage) => {
      try {
        const canceled = await cancelNicePaymentByTid({
          tid,
          orderId,
          reason: "승인 후 내부 라켓 주문 생성 실패로 자동 취소",
          clientKey,
          secretKey,
          apiBaseUrl: approveApiBase,
        });
        const cancelCode = pick(canceled, "resultCode", "ResultCode");
        const cancelMsg = pick(canceled, "resultMsg", "ResultMsg");
        const canceledOk = cancelCode === "0000";
        await col.updateOne(
          { _id: session._id },
          {
            $set: {
              status: canceledOk ? "approve_succeeded_auto_cancel_succeeded" : "approve_succeeded_auto_cancel_failed",
              failureStage,
              failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
              failureMessage,
              niceAuthRaw: raw,
              niceApprovedRaw: approvedRaw,
              updatedAt: new Date(),
              niceAutoCancel: {
                attemptedAt: new Date(),
                resultCode: cancelCode || "UNKNOWN",
                resultMsg: cancelMsg || undefined,
                status: canceledOk ? "succeeded" : "failed",
              },
            },
          },
        );
      } catch (cancelError: any) {
        await col.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "approve_succeeded_auto_cancel_failed",
              failureStage,
              failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
              failureMessage,
              niceAuthRaw: raw,
              niceApprovedRaw: approvedRaw,
              updatedAt: new Date(),
              niceAutoCancel: {
                attemptedAt: new Date(),
                resultCode: "ERROR",
                resultMsg: cancelError?.message || "자동 취소 중 오류가 발생했습니다.",
                status: "failed",
              },
            },
          },
        );
      }
    };

    const idemKey = `nice:racket:${orderId}`;
    const orderReq = new Request("http://internal/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idemKey,
      },
      body: JSON.stringify(createOrderPayload),
    });

    const orderRes = await createOrder(orderReq, {
      source: "nicepay_return",
      userIdOverride: session.userId ?? null,
    });

    const orderJson = await orderRes.json().catch(() => null);
    if (!orderRes.ok || !orderJson?.orderId) {
      const failureMessage = orderJson?.error ?? "주문 생성에 실패했습니다.";
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "approve_succeeded_order_failed",
            failureStage: "create_order_after_approve",
            failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
            failureMessage,
            niceAuthRaw: raw,
            niceApprovedRaw: approvedRaw,
            updatedAt: new Date(),
          },
        },
      );
      await tryAutoCancelAfterApprove(failureMessage, "create_order_after_approve");
      return NextResponse.redirect(
        new URL(
          toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "결제 승인 후 주문 처리에 실패했습니다.", fallbackPath),
          req.url,
        ),
      );
    }

    const mongoOrderId = String(orderJson.orderId);

    await db.collection("orders").updateOne(
      { _id: new ObjectId(mongoOrderId) },
      {
        $set: {
          paymentStatus: "결제완료",
          paymentInfo: {
            provider: "nicepay",
            method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
            status: "paid",
            tid,
            approvedAt: new Date(),
            rawSummary: {
              orderId,
              totalAmount: amount,
              card: (() => {
                const card = extractNiceCardInfo(approvedRaw);
                if (!card) return undefined;
                return {
                  issuerCode: card.issuerCode ?? undefined,
                  acquirerCode: card.acquirerCode ?? undefined,
                  issuerName: card.issuerName ?? undefined,
                  acquirerName: card.acquirerName ?? undefined,
                  cardName: card.cardName ?? undefined,
                };
              })(),
              easyPay: (() => {
                const provider = extractNiceEasyPayProvider(approvedRaw);
                return provider ? { provider } : undefined;
              })(),
            },
          },
          updatedAt: new Date(),
        },
      },
    );

    await col.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "approved",
          mongoOrderId,
          paymentKey: tid,
          niceAuthRaw: raw,
          niceApprovedRaw: approvedRaw,
          confirmedPaymentSummary: {
            orderId,
            method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
            totalAmount: amount,
            approvedAt: new Date(),
          },
          updatedAt: new Date(),
        },
        $unset: {
          failureStage: "",
          failureCode: "",
          failureMessage: "",
        },
      },
    );

    return NextResponse.redirect(new URL(`/racket-orders/${encodeURIComponent(mongoOrderId)}/select-string`, req.url));
  } catch (error: any) {
    return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "결제 승인 처리 중 오류가 발생했습니다."), req.url));
  }
}

export async function GET(req: Request) {
  return handleNiceRacketReturn(req);
}

export async function POST(req: Request) {
  return handleNiceRacketReturn(req);
}
