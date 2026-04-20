import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getPackagePricingInfo } from "@/app/features/packages/api/db";
import { markPackageOrderPaid } from "@/lib/package-orders/mark-paid";
import { approveNicePaymentByTid, cancelNicePaymentByTid, extractNiceCardInfo, extractNiceEasyPayProvider } from "@/lib/payments/nice/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions, type TossPaymentFailureStage } from "@/lib/payments/toss/session";

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
  return `/services/packages/nice/fail?${qs.toString()}`;
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

async function handleNicePackageReturn(req: Request) {
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

    if (session.provider !== "nicepay" || session.flowType !== "package_order") {
      return NextResponse.redirect(new URL(toFailUrl("SESSION_NOT_FOUND", "패키지 Nice 결제 세션이 아닙니다."), req.url));
    }

    if (session.status === "approved" && session.mongoOrderId) {
      return NextResponse.redirect(new URL(`/services/packages/success?packageOrderId=${encodeURIComponent(session.mongoOrderId)}`, req.url));
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

    const markFailure = async (params: { stage: TossPaymentFailureStage; code: string; message: string; includeApproveRaw?: Record<string, string> }) => {
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
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다."), req.url));
    }

    const prepared = session.nicePrepared || { clientId: "", orderId: "" };
    if (!tid || !authToken || !signature || !clientId || !prepared.clientId || clientId !== prepared.clientId) {
      await markFailure({ stage: "verify_auth", code: "AUTH_FAILED", message: "인증 응답 필수값 검증에 실패했습니다." });
      return NextResponse.redirect(new URL(toFailUrl("AUTH_FAILED", "인증 응답 필수값 검증에 실패했습니다."), req.url));
    }

    if (!Number.isFinite(amount) || amount <= 0 || session.amount !== amount || prepared.orderId !== orderId) {
      await markFailure({ stage: "verify_auth", code: "AMOUNT_MISMATCH", message: "결제 금액 검증에 실패했습니다." });
      return NextResponse.redirect(new URL(toFailUrl("AMOUNT_MISMATCH", "결제 금액 검증에 실패했습니다."), req.url));
    }

    const { clientKey, secretKey } = getApproveCredentials();
    const approveApiBase = getApproveApiBase();
    if (!clientKey || !secretKey) {
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다."), req.url));
    }

    let approvedRaw: Record<string, string>;
    try {
      approvedRaw = await approveNicePaymentByTid({ tid, amount, clientKey, secretKey, apiBaseUrl: approveApiBase });
    } catch (error: any) {
      await markFailure({ stage: "approve_payment", code: "APPROVE_FAILED", message: error?.message || "승인 처리에 실패했습니다." });
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "승인 처리에 실패했습니다."), req.url));
    }

    const approveResultCode = pick(approvedRaw, "resultCode", "ResultCode");
    if (approveResultCode !== "0000") {
      const message = pick(approvedRaw, "resultMsg", "ResultMsg") || "승인 처리에 실패했습니다.";
      await markFailure({ stage: "approve_payment", code: "APPROVE_FAILED", message, includeApproveRaw: approvedRaw });
      return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", message), req.url));
    }

    const packagePayload = session.packagePayload;
    const packageId = String(packagePayload?.packageId ?? "");
    const serviceInfo = packagePayload?.serviceInfo;

    const tryAutoCancelAfterApprove = async (failureMessage: string, failureStage: TossPaymentFailureStage) => {
      try {
        const canceled = await cancelNicePaymentByTid({
          tid,
          orderId,
          reason: "승인 후 내부 패키지 주문 생성 실패로 자동 취소",
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
                resultCode: String(cancelError?.resultCode || cancelError?.code || "AUTO_CANCEL_REQUEST_ERROR"),
                resultMsg: cancelError?.message || "자동 취소 중 오류가 발생했습니다.",
                status: "failed",
              },
            },
          },
        );
      }
    };

    if (!packageId || !serviceInfo?.name || !serviceInfo?.email || !serviceInfo?.phone) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "approve_succeeded_order_failed",
            failureStage: "create_order_after_approve",
            failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
            failureMessage: "결제 승인 후 패키지 주문 데이터를 복원하지 못했습니다.",
            niceAuthRaw: raw,
            niceApprovedRaw: approvedRaw,
            updatedAt: new Date(),
          },
        },
      );
      await tryAutoCancelAfterApprove("결제 승인 후 패키지 주문 데이터를 복원하지 못했습니다.", "create_order_after_approve");
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "결제 승인 후 주문 처리에 실패했습니다."), req.url));
    }

    const { configById } = await getPackagePricingInfo();
    const config = configById[packageId];
    if (!config || !config.isActive || Number(config.price) !== amount) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "approve_succeeded_order_failed",
            failureStage: "create_order_after_approve",
            failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
            failureMessage: "결제 승인 후 패키지 가격 검증에 실패했습니다.",
            niceAuthRaw: raw,
            niceApprovedRaw: approvedRaw,
            updatedAt: new Date(),
          },
        },
      );
      await tryAutoCancelAfterApprove("결제 승인 후 패키지 가격 검증에 실패했습니다.", "create_order_after_approve");
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "결제 승인 후 주문 처리에 실패했습니다."), req.url));
    }

    if (!session.userId || !ObjectId.isValid(String(session.userId))) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "approve_succeeded_order_failed",
            failureStage: "create_order_after_approve",
            failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
            failureMessage: "결제 승인 후 사용자 정보를 검증하지 못했습니다.",
            niceAuthRaw: raw,
            niceApprovedRaw: approvedRaw,
            updatedAt: new Date(),
          },
        },
      );
      await tryAutoCancelAfterApprove("결제 승인 후 사용자 정보를 검증하지 못했습니다.", "create_order_after_approve");
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "결제 승인 후 주문 처리에 실패했습니다."), req.url));
    }

    const packageOrders = db.collection("packageOrders");
    const insertRes = await packageOrders.insertOne({
      userId: new ObjectId(String(session.userId)),
      createdAt: now,
      updatedAt: now,
      status: "주문접수",
      paymentStatus: "결제대기",
      totalPrice: amount,
      packageInfo: {
        id: config.id,
        title: config.name,
        sessions: Number(config.sessions),
        price: Number(config.price),
        validityPeriod: Number(config.validityDays ?? 365),
      },
      serviceInfo: {
        depositor: null,
        serviceRequest: serviceInfo.serviceRequest || "",
        serviceMethod: "방문이용",
        name: serviceInfo.name,
        phone: serviceInfo.phone,
        email: serviceInfo.email,
      },
      paymentInfo: {
        provider: "nicepay",
        method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
        approvedAt: new Date(),
        rawSummary: {
          orderId,
          totalAmount: amount,
          card: (() => {
            const niceCard = extractNiceCardInfo(approvedRaw);
            if (!niceCard) return undefined;
            return {
              issuerCode: niceCard.issuerCode ?? undefined,
              acquirerCode: niceCard.acquirerCode ?? undefined,
              issuerName: niceCard.issuerName ?? undefined,
              acquirerName: niceCard.acquirerName ?? undefined,
              cardName: niceCard.cardName ?? undefined,
            };
          })(),
          easyPay: (() => {
            const provider = extractNiceEasyPayProvider(approvedRaw);
            return provider ? { provider } : undefined;
          })(),
        },
        tid,
      },
      history: [
        {
          status: "주문접수",
          date: now,
          description: `${config.sessions}회 패키지 주문 접수`,
        },
      ],
      userSnapshot: { name: serviceInfo.name, email: serviceInfo.email },
      meta: { niceOrderId: orderId },
    });

    const packageOrderId = insertRes.insertedId.toString();

    try {
      await markPackageOrderPaid(db, {
        packageOrderId,
        actorLabel: "nicepay-return",
        reason: `Nice 결제 승인(${orderId})`,
        paymentInfoPatch: {
          provider: "nicepay",
          method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
          approvedAt: new Date(),
          rawSummary: {
            orderId,
            totalAmount: amount,
            card: (() => {
              const niceCard = extractNiceCardInfo(approvedRaw);
              if (!niceCard) return undefined;
              return {
                issuerCode: niceCard.issuerCode ?? undefined,
                acquirerCode: niceCard.acquirerCode ?? undefined,
                issuerName: niceCard.issuerName ?? undefined,
                acquirerName: niceCard.acquirerName ?? undefined,
                cardName: niceCard.cardName ?? undefined,
              };
            })(),
            easyPay: (() => {
              const provider = extractNiceEasyPayProvider(approvedRaw);
              return provider ? { provider } : undefined;
            })(),
          },
          tid,
        },
      });
    } catch (error: any) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "approve_succeeded_order_failed",
            failureStage: "create_order_after_approve",
            failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
            failureMessage: error?.message || "결제 승인 후 패키지 주문 후처리에 실패했습니다.",
            niceAuthRaw: raw,
            niceApprovedRaw: approvedRaw,
            mongoOrderId: packageOrderId,
            updatedAt: new Date(),
          },
        },
      );
      await tryAutoCancelAfterApprove(error?.message || "결제 승인 후 패키지 주문 후처리에 실패했습니다.", "create_order_after_approve");
      return NextResponse.redirect(new URL(toFailUrl("ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE", "결제 승인 후 주문 처리에 실패했습니다."), req.url));
    }

    await col.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "approved",
          mongoOrderId: packageOrderId,
          niceAuthRaw: raw,
          niceApprovedRaw: approvedRaw,
          confirmedPaymentSummary: {
            orderId,
            method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
            totalAmount: amount,
            approvedAt: new Date(),
            card: (() => {
              const niceCard = extractNiceCardInfo(approvedRaw);
              if (!niceCard) return undefined;
              return {
                issuerCode: niceCard.issuerCode ?? undefined,
                acquirerCode: niceCard.acquirerCode ?? undefined,
                issuerName: niceCard.issuerName ?? undefined,
                acquirerName: niceCard.acquirerName ?? undefined,
                cardName: niceCard.cardName ?? undefined,
              };
            })(),
            easyPay: (() => {
              const provider = extractNiceEasyPayProvider(approvedRaw);
              return provider ? { provider } : undefined;
            })(),
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

    return NextResponse.redirect(new URL(`/services/packages/success?packageOrderId=${encodeURIComponent(packageOrderId)}`, req.url));
  } catch (error: any) {
    return NextResponse.redirect(new URL(toFailUrl("APPROVE_FAILED", error?.message || "결제 승인 처리 중 오류가 발생했습니다."), req.url));
  }
}

export async function GET(req: Request) {
  return handleNicePackageReturn(req);
}

export async function POST(req: Request) {
  return handleNicePackageReturn(req);
}
