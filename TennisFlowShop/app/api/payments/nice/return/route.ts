import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { createOrder } from "@/app/features/orders/api/handlers";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";
import { approveNicePaymentByTid } from "@/lib/payments/nice/server";

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

function pick(raw: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function toFailUrl(code: string, message?: string) {
  const qs = new URLSearchParams({ code });
  if (message) qs.set("message", message);
  return `/checkout/nice/fail?${qs.toString()}`;
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
    if (text.trim()) {
      return Object.fromEntries(new URLSearchParams(text));
    }
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

async function handleNiceReturn(req: Request) {
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
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "orderId 값이 누락되었습니다."), req.url));
    }

    const client = await clientPromise;
    const db = client.db();
    await ensureTossPaymentSessionIndexes(db);
    const col = tossPaymentSessions(db);
    const session = await col.findOne({ niceOrderId: orderId });

    if (!session || (session.provider && session.provider !== "nicepay")) {
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "결제 세션을 찾을 수 없습니다."), req.url));
    }

    if (session.status === "approved" && session.mongoOrderId) {
      return NextResponse.redirect(new URL(`/checkout/success?orderId=${encodeURIComponent(session.mongoOrderId)}`, req.url));
    }

    if (session.status === "approve_succeeded_order_failed") {
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", session.failureMessage || "승인 이후 주문 처리 실패 상태입니다."), req.url));
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
      return NextResponse.redirect(new URL(toFailUrl("SESSION_EXPIRED", "결제 세션 유효시간이 만료되었습니다."), req.url));
    }

    if (authResultCode !== "0000") {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "verify_auth",
            failureCode: "AUTH_FAILED",
            failureMessage: authResultMsg || "인증 결제에 실패했습니다.",
            niceAuthRaw: raw,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다."), req.url));
    }

    const prepared = session.nicePrepared || { clientId: "", orderId: "" };
    if (!tid || !authToken || !signature || !clientId || !prepared.clientId || clientId !== prepared.clientId) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "verify_auth",
            failureCode: "AUTH_FAILED",
            failureMessage: "인증 응답 필수값 검증에 실패했습니다.",
            niceAuthRaw: raw,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", "인증 응답 필수값 검증에 실패했습니다."), req.url));
    }

    if (!Number.isFinite(amount) || amount <= 0 || session.amount !== amount || prepared.orderId !== orderId) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "verify_auth",
            failureCode: "AMOUNT_MISMATCH",
            failureMessage: "결제 금액 검증에 실패했습니다.",
            niceAuthRaw: raw,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("AMOUNT_MISMATCH", "결제 금액 검증에 실패했습니다."), req.url));
    }

    const { clientKey, secretKey } = getApproveCredentials();
    const approveApiBase = getApproveApiBase();
    if (!clientKey || !secretKey) {
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다."), req.url));
    }

    let approvedRaw = session.niceApprovedRaw;
    if (!approvedRaw || Object.keys(approvedRaw).length === 0) {
      try {
        console.info("[nicepay][approve][request]", { tid, amount, approveApiBase, orderId });
        approvedRaw = await approveNicePaymentByTid({
          tid,
          amount,
          clientKey,
          secretKey,
          apiBaseUrl: approveApiBase,
        });
      } catch (error: any) {
        console.error("[nicepay][approve][failed]", {
          failureStage: "approve_payment",
          httpStatus: error?.httpStatus ?? null,
          resultCode: error?.resultCode ?? null,
          resultMsg: error?.resultMsg ?? error?.message ?? null,
        });
        console.error("[nicepay][approve][failed:raw]", {
          name: error?.name ?? null,
          message: error?.message ?? null,
          code: error?.code ?? null,
          cause: error?.cause ?? null,
        });
        await col.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "failed",
              failureStage: "approve_payment",
              failureCode: "APPROVE_FAILED",
              failureMessage: error?.message || "승인 처리에 실패했습니다.",
              niceAuthRaw: raw,
              updatedAt: new Date(),
            },
          },
        );
        return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "승인 처리에 실패했습니다."), req.url));
      }
    }

    const resultCode = pick(approvedRaw, "resultCode", "ResultCode");
    if (resultCode !== "0000") {
      const resultMsg = pick(approvedRaw, "resultMsg", "ResultMsg") || "승인 처리에 실패했습니다.";
      console.error("[nicepay][approve][failed]", {
        failureStage: "approve_payment",
        httpStatus: null,
        resultCode,
        resultMsg,
      });
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "approve_payment",
            failureCode: "APPROVE_FAILED",
            failureMessage: resultMsg,
            niceAuthRaw: raw,
            niceApprovedRaw: approvedRaw,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", resultMsg), req.url));
    }

    const idemKey = `nice:${orderId}`;
    const orderReq = new Request("http://internal/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idemKey,
      },
      body: JSON.stringify(session.checkoutPayload ?? {}),
    });

    const orderRes = await createOrder(orderReq);
    const orderJson = await orderRes.json();
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
            confirmedPaymentSummary: {
              orderId,
              method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
              totalAmount: amount,
              approvedAt: new Date(),
            },
            updatedAt: new Date(),
          },
        },
      );

      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "승인 후 주문 생성에 실패했습니다. 주문 내역을 확인해주세요."), req.url));
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
            status: pick(approvedRaw, "status") || "paid",
            tid,
            total: amount,
            approvedAt: pick(approvedRaw, "paidAt") || new Date().toISOString(),
            rawSummary: {
              orderId,
              resultCode,
              resultMsg: pick(approvedRaw, "resultMsg", "ResultMsg"),
              goodsName: pick(approvedRaw, "goodsName", "GoodsName"),
              card: pick(approvedRaw, "cardName") ? { cardName: pick(approvedRaw, "cardName") } : undefined,
              easyPay: pick(approvedRaw, "easyPayProvider") ? { provider: pick(approvedRaw, "easyPayProvider") } : undefined,
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

    return NextResponse.redirect(new URL(`/checkout/success?orderId=${encodeURIComponent(mongoOrderId)}`, req.url));
  } catch (error: any) {
    return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "결제 승인 처리 중 오류가 발생했습니다."), req.url));
  }
}

export async function GET(req: Request) {
  return handleNiceReturn(req);
}

export async function POST(req: Request) {
  return handleNiceReturn(req);
}
