import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { createOrder } from "@/app/features/orders/api/handlers";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";
import { approveNicePayment, createNiceSignData, triggerNiceNetCancel, verifyNiceAuthSignature } from "@/lib/payments/nice/server";

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

  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

async function handleNiceReturn(req: Request) {
  try {
    const raw = await parseRequestPayload(req);

    const authResultCode = pick(raw, "AuthResultCode", "authResultCode");
    const authResultMsg = pick(raw, "AuthResultMsg", "authResultMsg");
    const authToken = pick(raw, "AuthToken", "authToken");
    const mid = pick(raw, "MID", "Mid", "mid");
    const moid = pick(raw, "Moid", "MOID", "moid");
    const signature = pick(raw, "Signature", "signature");
    const txTid = pick(raw, "TxTid", "TID", "tid");
    const nextAppUrl = pick(raw, "NextAppURL", "nextAppUrl");
    const netCancelUrl = pick(raw, "NetCancelURL", "netCancelUrl");
    const amt = Number(pick(raw, "Amt", "amt") || 0);

    if (!moid) {
      return NextResponse.redirect(new URL(toFailUrl("INVALID_QUERY", "Moid 값이 누락되었습니다."), req.url));
    }

    const client = await clientPromise;
    const db = client.db();
    await ensureTossPaymentSessionIndexes(db);
    const col = tossPaymentSessions(db);
    const session = await col.findOne({ niceMoid: moid });

    if (!session) {
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "결제 세션을 찾을 수 없습니다."), req.url));
    }
    if (session.provider && session.provider !== "nicepay") {
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "나이스 결제 세션이 아닙니다."), req.url));
    }

    if (session.status === "approved" && session.mongoOrderId) {
      return NextResponse.redirect(new URL(`/checkout/success?orderId=${encodeURIComponent(session.mongoOrderId)}`, req.url));
    }

    if (session.status === "approve_succeeded_order_failed") {
      return NextResponse.redirect(new URL(toFailUrl("NET_CANCEL_REQUIRED", session.failureMessage || "승인 이후 주문 처리 실패 상태입니다."), req.url));
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
            netCancelUrl: netCancelUrl || session.netCancelUrl,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다."), req.url));
    }

    if (!Number.isFinite(amt) || amt <= 0 || session.amount !== amt) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "verify_auth",
            failureCode: "AMOUNT_MISMATCH",
            failureMessage: "결제 금액 검증에 실패했습니다.",
            niceAuthRaw: raw,
            netCancelUrl: netCancelUrl || session.netCancelUrl,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("AMOUNT_MISMATCH", "결제 금액 검증에 실패했습니다."), req.url));
    }

    const merchantKey = String(process.env.NICEPAY_MERCHANT_KEY ?? "").trim();
    const ediDate = session.nicePrepared?.ediDate || "";
    if (!merchantKey || !ediDate) {
      return NextResponse.redirect(new URL(toFailUrl("NICE_CONFIG_MISSING", "결제 설정이 올바르지 않습니다."), req.url));
    }

    const signatureValid = verifyNiceAuthSignature({
      authToken,
      mid,
      amt,
      ediDate,
      merchantKey,
      signature,
    });

    if (!signatureValid) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "verify_auth",
            failureCode: "SIGNATURE_MISMATCH",
            failureMessage: "인증 응답 위변조 검증에 실패했습니다.",
            niceAuthRaw: raw,
            netCancelUrl: netCancelUrl || session.netCancelUrl,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", "인증 응답 검증에 실패했습니다."), req.url));
    }

    let approvedRaw = session.niceApprovedRaw;
    if (!approvedRaw || Object.keys(approvedRaw).length === 0) {
      const signData = createNiceSignData({
        ediDate,
        mid,
        amt,
        merchantKey,
      });
      try {
        approvedRaw = await approveNicePayment({
          nextAppUrl,
          tid: txTid,
          authToken,
          mid,
          amt,
          ediDate,
          signData,
        });
      } catch (error: any) {
        await col.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "failed",
              failureStage: "approve_payment",
              failureCode: "APPROVE_FAILED",
              failureMessage: error?.message || "승인 처리에 실패했습니다.",
              niceAuthRaw: raw,
              netCancelUrl: netCancelUrl || session.netCancelUrl,
              updatedAt: new Date(),
            },
          },
        );
        return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "승인 처리에 실패했습니다."), req.url));
      }
    }

    const resultCode = pick(approvedRaw, "ResultCode", "resultCode");
    if (resultCode !== "3001") {
      const resultMsg = pick(approvedRaw, "ResultMsg", "resultMsg") || "승인 처리에 실패했습니다.";
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
            netCancelUrl: netCancelUrl || session.netCancelUrl,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", resultMsg), req.url));
    }

    const idemKey = `nice:${moid}`;
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
      const netCancelResult = await triggerNiceNetCancel(netCancelUrl || session.netCancelUrl, {
        TID: txTid,
        MID: mid,
        Moid: moid,
        Amt: String(amt),
      });

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
            netCancelUrl: netCancelUrl || session.netCancelUrl,
            confirmedPaymentSummary: {
              orderId: moid,
              method: pick(approvedRaw, "PayMethod", "payMethod") || "CARD",
              totalAmount: amt,
              approvedAt: new Date(),
            },
            updatedAt: new Date(),
          },
        },
      );

      const failCode = netCancelResult.ok ? "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE" : "NET_CANCEL_REQUIRED";
      const failMessage = netCancelResult.ok ? "승인 후 주문 생성에 실패했습니다. 결제 취소 처리 여부를 확인해주세요." : "망취소 대상입니다. 운영 확인이 필요합니다.";
      return NextResponse.redirect(new URL(toFailUrl(failCode, failMessage), req.url));
    }

    const mongoOrderId = String(orderJson.orderId);
    await db.collection("orders").updateOne(
      { _id: new ObjectId(mongoOrderId) },
      {
        $set: {
          paymentStatus: "결제완료",
          paymentInfo: {
            provider: "nicepay",
            method: pick(approvedRaw, "PayMethod", "payMethod") || "CARD",
            status: "paid",
            tid: txTid,
            total: amt,
            approvedAt: new Date(),
            rawSummary: {
              moid,
              resultCode,
              resultMsg: pick(approvedRaw, "ResultMsg", "resultMsg"),
              goodsName: pick(approvedRaw, "GoodsName", "goodsName"),
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
          netCancelUrl: netCancelUrl || session.netCancelUrl,
          confirmedPaymentSummary: {
            orderId: moid,
            method: pick(approvedRaw, "PayMethod", "payMethod") || "CARD",
            totalAmount: amt,
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
