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
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function parsePayload(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await req.formData();
    const obj: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      obj[key] = typeof value === "string" ? value : "";
    }
    return obj;
  }

  if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.entries(json).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] =
        typeof value === "string"
          ? value
          : value === undefined || value === null
            ? ""
            : String(value);
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
  url.searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

function failUrl(code: string, message: string, applicationId?: string | null) {
  const query = new URLSearchParams({
    mode: "single",
    paymentError: code,
    message,
  });

  if (applicationId) {
    query.set("applicationId", applicationId);
  }

  return `/services/apply?${query.toString()}`;
}

function redirect303(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), { status: 303 });
}

function approveCredentials() {
  return {
    clientKey: String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim(),
    secretKey: String(process.env.NICEPAY_SECRET_KEY ?? "").trim(),
    apiBaseUrl: String(
      process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments",
    )
      .trim()
      .replace(/\/+$/, ""),
  };
}

async function handleNiceStringingReturn(req: Request) {
  const raw = await parsePayload(req);
  let safeApplicationId: string | null = null;
  const authResultCode = pick(raw, "authResultCode", "AuthResultCode", "resultCode", "ResultCode");
  const authResultMsg = pick(raw, "authResultMsg", "AuthResultMsg", "resultMsg", "ResultMsg");
  const tid = pick(raw, "tid", "TID", "TxTid");
  const clientId = pick(raw, "clientId", "ClientId", "CID");
  const orderId = pick(raw, "orderId", "OrderId", "MOID", "Moid");
  const amount = Math.floor(Number(pick(raw, "amount", "Amt") || 0));
  const authToken = pick(raw, "authToken", "AuthToken");
  const signature = pick(raw, "signature", "Signature");

  try {
    const client = await clientPromise;
    const db = client.db();
    await ensureTossPaymentSessionIndexes(db);
    const sessions = tossPaymentSessions(db);
    let session = await sessions.findOne({ niceOrderId: orderId });
    if (!session || session.flowType !== "stringing_application") {
      return redirect303(req, failUrl("SESSION_NOT_FOUND", "결제 세션을 찾을 수 없습니다."));
    }
    safeApplicationId = String(session.applicationId ?? "") || null;

    const toSuccessUrl = (applicationId: string) =>
      `/services/success?applicationId=${encodeURIComponent(applicationId)}`;

    if (session.status === "approved" && session.mongoOrderId) {
      return redirect303(req, toSuccessUrl(session.mongoOrderId));
    }

    if (
      session.status === "failed" ||
      session.status === "approve_succeeded_order_failed" ||
      session.status === "approve_succeeded_auto_cancel_succeeded" ||
      session.status === "approve_succeeded_auto_cancel_failed"
    ) {
      return redirect303(
        req,
        failUrl(
          session.failureCode || "PAYMENT_PROCESSING_FAILED",
          session.failureMessage || "결제 처리 결과를 확인해주세요.",
          safeApplicationId,
        ),
      );
    }

    const now = new Date();
    if (session.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const latest = await sessions.findOne({ niceOrderId: orderId });

      if (latest?.status === "approved" && latest.mongoOrderId) {
        return redirect303(req, toSuccessUrl(latest.mongoOrderId));
      }

      if (
        latest?.status === "approve_succeeded_order_failed" ||
        latest?.status === "approve_succeeded_auto_cancel_succeeded" ||
        latest?.status === "approve_succeeded_auto_cancel_failed" ||
        latest?.status === "failed"
      ) {
        return redirect303(
          req,
          failUrl(
            latest.failureCode || "PAYMENT_PROCESSING_FAILED",
            latest.failureMessage || "결제 처리 결과를 확인해주세요.",
            safeApplicationId,
          ),
        );
      }

      return redirect303(
        req,
        failUrl(
          "PAYMENT_PROCESSING",
          "결제 처리가 진행 중입니다. 중복 결제하지 말고 잠시 후 신청 내역을 확인해주세요.",
          safeApplicationId,
        ),
      );
    }

    if (session.expiresAt && session.expiresAt.getTime() < now.getTime()) {
      await sessions.updateOne(
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
      return redirect303(
        req,
        failUrl("SESSION_EXPIRED", "결제 세션 유효시간이 만료되었습니다.", safeApplicationId),
      );
    }

    if (session.status !== "ready") {
      return redirect303(
        req,
        failUrl(
          "INVALID_PAYMENT_SESSION_STATUS",
          "이미 처리 중이거나 처리 완료된 결제 세션입니다.",
          safeApplicationId,
        ),
      );
    }

    const claimedSession = await sessions.findOneAndUpdate(
      {
        _id: session._id,
        status: "ready",
      },
      {
        $set: {
          status: "processing",
          processingStartedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

    if (!claimedSession) {
      const latest = await sessions.findOne({ niceOrderId: orderId });

      if (latest?.status === "approved" && latest.mongoOrderId) {
        return redirect303(req, toSuccessUrl(latest.mongoOrderId));
      }

      if (
        latest?.status === "approve_succeeded_order_failed" ||
        latest?.status === "approve_succeeded_auto_cancel_succeeded" ||
        latest?.status === "approve_succeeded_auto_cancel_failed" ||
        latest?.status === "failed"
      ) {
        return redirect303(
          req,
          failUrl(
            latest.failureCode || "PAYMENT_PROCESSING_FAILED",
            latest.failureMessage || "결제 처리 결과를 확인해주세요.",
            safeApplicationId,
          ),
        );
      }

      return redirect303(
        req,
        failUrl(
          "PAYMENT_SESSION_ALREADY_PROCESSING",
          "결제 처리가 이미 진행 중입니다. 중복 결제하지 말고 잠시 후 신청 내역을 확인해주세요.",
          safeApplicationId,
        ),
      );
    }

    session = claimedSession;

    const markFailed = async (params: {
      stage: TossPaymentFailureStage;
      code: string;
      message: string;
      includeApproveRaw?: Record<string, string>;
    }) => {
      await sessions.updateOne(
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

    const prepared = session.nicePrepared;
    if (authResultCode !== "0000") {
      const authFailureMessage = authResultMsg || "카드/간편결제 인증에 실패했습니다.";
      await markFailed({
        stage: "verify_auth",
        code: "AUTH_FAILED",
        message: authFailureMessage,
      });
      return redirect303(req, failUrl("AUTH_FAILED", authFailureMessage, safeApplicationId));
    }

    if (!tid || !authToken || !signature || !clientId || !prepared) {
      await markFailed({
        stage: "verify_auth",
        code: "AUTH_FAILED",
        message: "인증 응답 필수값 검증에 실패했습니다.",
      });
      return redirect303(
        req,
        failUrl("AUTH_FAILED", "인증 응답 필수값 검증에 실패했습니다.", safeApplicationId),
      );
    }

    if (prepared.clientId !== clientId) {
      await markFailed({
        stage: "verify_auth",
        code: "AUTH_FAILED",
        message: "인증 응답 가맹점 검증에 실패했습니다.",
      });
      return redirect303(
        req,
        failUrl("AUTH_FAILED", "인증 응답 가맹점 검증에 실패했습니다.", safeApplicationId),
      );
    }

    if (prepared.orderId !== orderId || session.amount !== amount || amount <= 0) {
      await markFailed({
        stage: "verify_auth",
        code: "AMOUNT_MISMATCH",
        message: "결제 금액 검증에 실패했습니다.",
      });
      return redirect303(
        req,
        failUrl("AMOUNT_MISMATCH", "결제 금액 검증에 실패했습니다.", safeApplicationId),
      );
    }

    const credentials = approveCredentials();
    if (!credentials.clientKey || !credentials.secretKey) {
      await markFailed({
        stage: "approve_payment",
        code: "APPROVE_FAILED",
        message: "결제 승인 설정이 올바르지 않습니다.",
      });
      return redirect303(
        req,
        failUrl("APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다.", safeApplicationId),
      );
    }

    let approvedRaw: Record<string, string>;
    try {
      approvedRaw = await approveNicePaymentByTid({
        tid,
        amount,
        ...credentials,
      });
    } catch (error: any) {
      const message = error?.message || "카드/간편결제 승인에 실패했습니다.";
      await markFailed({
        stage: "approve_payment",
        code: "APPROVE_FAILED",
        message,
      });
      return redirect303(req, failUrl("APPROVE_FAILED", message, safeApplicationId));
    }

    if (pick(approvedRaw, "resultCode", "ResultCode") !== "0000") {
      const message =
        pick(approvedRaw, "resultMsg", "ResultMsg") || "카드/간편결제 승인에 실패했습니다.";
      await markFailed({
        stage: "approve_payment",
        code: "APPROVE_FAILED",
        message,
        includeApproveRaw: approvedRaw,
      });
      return redirect303(req, failUrl("APPROVE_FAILED", message, safeApplicationId));
    }

    const tryAutoCancelAfterApprove = async (
      failureMessage: string,
      failureStage: TossPaymentFailureStage,
    ) => {
      try {
        const canceled = await cancelNicePaymentByTid({
          tid,
          orderId,
          reason: "승인 후 내부 스트링 신청 처리 실패로 자동 취소",
          ...credentials,
        });
        const cancelCode = pick(canceled, "resultCode", "ResultCode");
        const cancelMsg = pick(canceled, "resultMsg", "ResultMsg");
        const canceledOk = cancelCode === "0000";
        await sessions.updateOne(
          { _id: session._id },
          {
            $set: {
              status: canceledOk
                ? "approve_succeeded_auto_cancel_succeeded"
                : "approve_succeeded_auto_cancel_failed",
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
        await sessions.updateOne(
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

    const markOrderFailedAndCancel = async (failureMessage: string) => {
      await sessions.updateOne(
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
    };

    const applicationId = String(session.applicationId ?? "");
    const application = ObjectId.isValid(applicationId)
      ? await db.collection("stringing_applications").findOne({ _id: new ObjectId(applicationId) })
      : null;
    if (
      !application ||
      application.orderId ||
      application.rentalId ||
      application.packageApplied ||
      application.servicePaid ||
      Number(application.totalPrice ?? 0) !== amount
    ) {
      await markOrderFailedAndCancel("결제 승인 후 신청 상태 검증에 실패했습니다.");
      return redirect303(
        req,
        failUrl(
          "APPLICATION_INVALID",
          "신청 상태가 변경되어 카드/간편결제가 취소되었습니다.",
          safeApplicationId,
        ),
      );
    }

    const card = extractNiceCardInfo(approvedRaw);
    const confirmedCard = card
      ? {
          issuerCode: card.issuerCode ?? undefined,
          acquirerCode: card.acquirerCode ?? undefined,
          issuerName: card.issuerName ?? undefined,
          acquirerName: card.acquirerName ?? undefined,
          cardName: card.cardName ?? card.displayName ?? undefined,
        }
      : undefined;
    const easyPayProvider = extractNiceEasyPayProvider(approvedRaw);
    const updateResult = await db.collection("stringing_applications").updateOne(
      {
        _id: application._id,
        servicePaid: { $ne: true },
        totalPrice: amount,
      },
      {
        $set: {
          servicePaid: true,
          paymentStatus: "결제완료",
          paymentMethod: "nicepay",
          paymentInfo: {
            provider: "nicepay",
            method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
            status: "결제완료",
            approvedAt: now,
            tid,
            easyPayProvider: easyPayProvider || null,
            cardDisplayName:
              card?.displayName ?? card?.cardName ?? card?.issuerName ?? card?.acquirerName ?? null,
            cardCompany: card?.issuerName ?? null,
            cardLabel: card?.cardName ?? null,
            niceCard: card ?? null,
            rawSummary: {
              orderId,
              totalAmount: amount,
              card: card ?? undefined,
            },
          },
          updatedAt: now,
        },
      },
    );

    if (!updateResult.modifiedCount) {
      await markOrderFailedAndCancel("결제 승인 후 신청서 반영에 실패했습니다.");
      return redirect303(
        req,
        failUrl("UPDATE_FAILED", "카드/간편결제 반영에 실패했습니다.", safeApplicationId),
      );
    }

    await sessions.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "approved",
          mongoOrderId: applicationId,
          paymentKey: tid,
          niceAuthRaw: raw,
          niceApprovedRaw: approvedRaw,
          confirmedPaymentSummary: {
            orderId,
            method: pick(approvedRaw, "payMethod", "PayMethod") || "card",
            totalAmount: amount,
            approvedAt: now,
            card: confirmedCard,
            easyPay: easyPayProvider ? { provider: easyPayProvider, amount } : undefined,
          },
          updatedAt: now,
        },
      },
    );

    return redirect303(req, toSuccessUrl(applicationId));
  } catch (error: any) {
    return redirect303(
      req,
      failUrl(
        "PAYMENT_ERROR",
        error?.message || "카드/간편결제 처리 중 오류가 발생했습니다.",
        safeApplicationId,
      ),
    );
  }
}

export async function GET(req: Request) {
  return handleNiceStringingReturn(req);
}

export async function POST(req: Request) {
  return handleNiceStringingReturn(req);
}
