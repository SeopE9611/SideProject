import { createOrder } from "@/app/features/orders/api/handlers";
import clientPromise from "@/lib/mongodb";
import { approveNicePaymentByTid, cancelNicePaymentByTid, extractNiceCardInfo, extractNiceEasyPayProvider, summarizeNiceCardRaw } from "@/lib/payments/nice/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions, type TossPaymentFailureStage } from "@/lib/payments/toss/session";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
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
    if (session.status === "approve_succeeded_auto_cancel_succeeded") {
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "승인 후 주문 생성 실패로 자동 취소가 완료되었습니다."), req.url));
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
    console.info("[nicepay][flow]", { stage: "approve_success", tid, orderId, amount, approveStatus: resultCode });
    const approveRawSummary = summarizeNiceCardRaw(approvedRaw);
    console.info("[nicepay][card][approve_raw_keys]", {
      orderId,
      tid,
      topLevelKeys: approveRawSummary.topLevelKeys,
      presentCardCandidateKeys: approveRawSummary.presentCandidateKeys,
    });

    const idemKey = `nice:${orderId}`;
    const orderReq = new Request("http://internal/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idemKey,
      },
      body: JSON.stringify(session.checkoutPayload ?? {}),
    });

    const tryAutoCancelAfterApprove = async (failureMessage: string, failureStage: TossPaymentFailureStage) => {
      const shouldSkipAutoCancel = session.status === "approve_succeeded_auto_cancel_succeeded" || session.niceAutoCancel?.status === "succeeded";
      if (shouldSkipAutoCancel) {
        await col.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "approve_succeeded_order_failed",
              failureStage,
              failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
              failureMessage,
              updatedAt: new Date(),
              niceAutoCancel: {
                attemptedAt: new Date(),
                resultCode: "SKIPPED_ALREADY_CANCELED",
                resultMsg: "이미 자동 취소 완료된 세션입니다.",
                status: "skipped",
              },
            },
          },
        );
        return { status: "skipped" as const, resultCode: "SKIPPED_ALREADY_CANCELED", resultMsg: "already canceled" };
      }
      try {
        const canceled = await cancelNicePaymentByTid({
          tid,
          orderId,
          reason: "승인 후 내부 주문 생성 실패로 자동 취소",
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
        console.info("[nicepay][flow]", {
          stage: canceledOk ? "approve_succeeded_auto_cancel_succeeded" : "approve_succeeded_auto_cancel_failed",
          tid,
          orderId,
          amount,
          cancelStatus: cancelCode || "UNKNOWN",
        });
        return { status: canceledOk ? ("succeeded" as const) : ("failed" as const), resultCode: cancelCode, resultMsg: cancelMsg };
      } catch (cancelError: any) {
        const cancelMsg = cancelError?.message || "자동 취소 중 오류가 발생했습니다.";
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
                resultCode: String(cancelError?.resultCode || cancelError?.code || "AUTO_CANCEL_REQUEST_ERROR"),
                resultMsg: cancelMsg,
                status: "failed",
              },
            },
          },
        );
        console.error("[nicepay][flow]", {
          stage: "approve_succeeded_auto_cancel_failed",
          tid,
          orderId,
          amount,
          cancelStatus: cancelError?.resultCode ?? cancelError?.code ?? "AUTO_CANCEL_REQUEST_ERROR",
          message: cancelMsg,
        });
        return { status: "failed" as const, resultCode: String(cancelError?.resultCode || cancelError?.code || "AUTO_CANCEL_REQUEST_ERROR"), resultMsg: cancelMsg };
      }
    };

    try {
      const cookieStore = await cookies();
      const hasAccessTokenCookie = Boolean(cookieStore.get("accessToken")?.value);
      const guestModeRaw = String(process.env.GUEST_ORDER_MODE ?? "on").trim();
      const guestMode = guestModeRaw === "off" || guestModeRaw === "legacy" || guestModeRaw === "on" ? guestModeRaw : "on";
      console.info("[nicepay][flow]", {
        stage: "before_create_order",
        source: "nicepay_return",
        tid,
        orderId,
        amount,
        hasAccessTokenCookie,
        hasUserId: Boolean(session.userId),
        guestMode,
        hasCheckoutPayload: Boolean(session.checkoutPayload),
      });
      const orderRes = await createOrder(orderReq, {
        source: "nicepay_return",
        userIdOverride: session.userId ?? null,
      });
      const orderJson = await orderRes.json();
      console.info("[nicepay][flow]", {
        stage: "after_create_order_response",
        source: "nicepay_return",
        tid,
        orderId,
        amount,
        orderResponseStatus: orderRes.status,
        orderResponseSummary: orderJson?.orderId ? "order_created" : orderJson?.code || orderJson?.error || "empty_response",
      });
      if (!orderRes.ok && orderJson?.code === "GUEST_ORDER_DISABLED") {
        console.error("[nicepay][flow]", {
          stage: "create_order_policy_failed",
          source: "nicepay_return",
          tid,
          orderId,
          guestMode,
          code: orderJson?.code,
        });
      }
      if (!orderRes.ok || !orderJson?.orderId) {
        const failureMessage = orderJson?.error ?? "주문 생성에 실패했습니다.";
        console.error("[nicepay][flow]", {
          stage: "before_auto_cancel_after_create_order_failed",
          source: "nicepay_return",
          tid,
          orderId,
          amount,
          failureReason: orderJson?.code || orderJson?.error || "unknown_create_order_failure",
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
        await tryAutoCancelAfterApprove(failureMessage, "create_order_after_approve");
        return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "승인 후 주문 생성에 실패했습니다. 주문 내역을 확인해주세요."), req.url));
      }

      const mongoOrderId = String(orderJson.orderId);
      const niceCard = extractNiceCardInfo(approvedRaw);
      const easyPayProvider = extractNiceEasyPayProvider(approvedRaw);
      console.info("[nicepay][card][approve_extract]", {
        orderId,
        tid,
        hasNiceCard: Boolean(niceCard),
        cardDisplayName: Boolean(niceCard?.displayName),
        cardCompany: Boolean(niceCard?.issuerName),
        cardLabel: Boolean(niceCard?.cardName),
        easyPayProvider: Boolean(easyPayProvider),
      });
      console.info("[nicepay][card][persist_summary]", {
        orderId,
        tid,
        source: "approve_return",
        cardDisplayName: Boolean(niceCard?.displayName),
        cardCompany: Boolean(niceCard?.issuerName),
        cardLabel: Boolean(niceCard?.cardName),
        niceCard: Boolean(niceCard),
        rawSummaryCard: Boolean(niceCard),
        rawSummaryEasyPay: Boolean(easyPayProvider),
      });
      console.info("[nicepay][flow]", { stage: "before_order_update", tid, orderId, mongoOrderId });
      const orderUpdateResult = await db.collection("orders").updateOne(
        { _id: new ObjectId(mongoOrderId) },
        {
          $set: {
            orderId,
            paymentStatus: "결제완료",
            paymentInfo: {
              provider: "nicepay",
              method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
              status: pick(approvedRaw, "status") || "paid",
              tid,
              total: amount,
              approvedAt: pick(approvedRaw, "paidAt") || new Date().toISOString(),
              cardDisplayName: niceCard?.displayName || undefined,
              cardCompany: niceCard?.issuerName || undefined,
              cardLabel: niceCard?.cardName || undefined,
              niceCard: niceCard || undefined,
              rawSummary: {
                orderId,
                resultCode,
                resultMsg: pick(approvedRaw, "resultMsg", "ResultMsg"),
                goodsName: pick(approvedRaw, "goodsName", "GoodsName"),
                card: niceCard
                  ? {
                      cardName: niceCard.cardName ?? undefined,
                      issuerName: niceCard.issuerName ?? undefined,
                      issuerCode: niceCard.issuerCode ?? undefined,
                      acquirerName: niceCard.acquirerName ?? undefined,
                      acquirerCode: niceCard.acquirerCode ?? undefined,
                      cardCode: niceCard.cardCode ?? undefined,
                    }
                  : undefined,
                easyPay: easyPayProvider ? { provider: easyPayProvider } : undefined,
              },
              niceSync: {
                lastSyncedAt: new Date().toISOString(),
                source: "approve_return",
              },
            },
            updatedAt: new Date(),
          },
        },
      );
      console.info("[nicepay][flow]", {
        stage: "after_order_update",
        tid,
        orderId,
        mongoOrderId,
        matchedCount: orderUpdateResult.matchedCount,
        modifiedCount: orderUpdateResult.modifiedCount,
      });
      if (orderUpdateResult.matchedCount === 0) {
        throw new Error("ORDER_UPDATE_TARGET_NOT_FOUND");
      }

      console.info("[nicepay][flow]", { stage: "before_session_update", tid, orderId, mongoOrderId });
      const sessionUpdateResult = await col.updateOne(
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
      console.info("[nicepay][flow]", {
        stage: "after_session_update",
        tid,
        orderId,
        mongoOrderId,
        sessionStatus: "approved",
        matchedCount: sessionUpdateResult.matchedCount,
        modifiedCount: sessionUpdateResult.modifiedCount,
      });
      if (sessionUpdateResult.matchedCount === 0) {
        throw new Error("SESSION_UPDATE_TARGET_NOT_FOUND");
      }
      console.info("[nicepay][flow]", { stage: "before_success_redirect", tid, orderId, mongoOrderId });
      return NextResponse.redirect(new URL(`/checkout/success?orderId=${encodeURIComponent(mongoOrderId)}`, req.url));
    } catch (downstreamError: any) {
      const failureMessage = downstreamError?.message || "승인 이후 내부 주문 후처리에 실패했습니다.";
      console.error("[nicepay][flow]", {
        stage: "downstream_failed_after_approve",
        tid,
        orderId,
        amount,
        message: failureMessage,
      });
      await tryAutoCancelAfterApprove(failureMessage, "create_order_after_approve");
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "승인 후 내부 주문 처리에 실패했습니다. 결제 상태를 확인해주세요."), req.url));
    }
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
