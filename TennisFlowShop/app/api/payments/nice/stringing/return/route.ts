import clientPromise from "@/lib/mongodb";
import { approveNicePaymentByTid, cancelNicePaymentByTid, extractNiceCardInfo, extractNiceEasyPayProvider } from "@/lib/payments/nice/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";
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
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
  }
  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, string>;
  }
  return Object.fromEntries(new URL(req.url).searchParams.entries());
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

function approveCredentials() {
  return {
    clientKey: String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim(),
    secretKey: String(process.env.NICEPAY_SECRET_KEY ?? "").trim(),
    apiBaseUrl: String(process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments")
      .trim()
      .replace(/\/+$/, ""),
  };
}

async function handleNiceStringingReturn(req: Request) {
  const raw = await parsePayload(req);
  let safeApplicationId: string | null = null;
  const orderId = pick(raw, "orderId", "OrderId");
  const tid = pick(raw, "tid", "Tid");
  const amount = Math.floor(Number(pick(raw, "amount", "Amt") || 0));
  const authResultCode = pick(raw, "resultCode", "ResultCode", "authResultCode");
  const authToken = pick(raw, "authToken", "AuthToken");
  const signature = pick(raw, "signature", "Signature");
  const clientId = pick(raw, "clientId", "ClientId");

  try {
    const client = await clientPromise;
    const db = client.db();
    await ensureTossPaymentSessionIndexes(db);
    const sessions = tossPaymentSessions(db);
    const session = await sessions.findOne({ niceOrderId: orderId });
    if (!session || session.flowType !== "stringing_application") {
      return NextResponse.redirect(new URL(failUrl("SESSION_NOT_FOUND", "결제 세션을 찾을 수 없습니다."), req.url));
    }
    safeApplicationId = String(session.applicationId ?? "") || null;

    const markFailed = async (message: string) => {
      await sessions.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureMessage: message,
            niceAuthRaw: raw,
            updatedAt: new Date(),
          },
        },
      );
    };

    const prepared = session.nicePrepared;
    if (authResultCode !== "0000" || !tid || !authToken || !signature || !clientId || !prepared || prepared.clientId !== clientId || prepared.orderId !== orderId || session.amount !== amount || amount <= 0) {
      await markFailed("결제 인증 또는 금액 검증에 실패했습니다.");
      return NextResponse.redirect(new URL(failUrl("AUTH_FAILED", "카드/간편결제 인증에 실패했습니다.", safeApplicationId), req.url));
    }

    const credentials = approveCredentials();
    const approvedRaw = await approveNicePaymentByTid({
      tid,
      amount,
      ...credentials,
    });
    if (pick(approvedRaw, "resultCode", "ResultCode") !== "0000") {
      await markFailed(pick(approvedRaw, "resultMsg", "ResultMsg") || "카드/간편결제 승인에 실패했습니다.");
      return NextResponse.redirect(new URL(failUrl("APPROVE_FAILED", "카드/간편결제 승인에 실패했습니다.", safeApplicationId), req.url));
    }

    const applicationId = String(session.applicationId ?? "");
    const application = ObjectId.isValid(applicationId) ? await db.collection("stringing_applications").findOne({ _id: new ObjectId(applicationId) }) : null;
    if (!application || application.packageApplied || application.servicePaid || Number(application.totalPrice ?? 0) !== amount) {
      await cancelNicePaymentByTid({
        tid,
        orderId,
        reason: "스트링 신청 결제 상태 검증 실패",
        ...credentials,
      });
      await markFailed("결제 승인 후 신청 상태 검증에 실패했습니다.");
      return NextResponse.redirect(new URL(failUrl("APPLICATION_INVALID", "신청 상태가 변경되어 카드/간편결제가 취소되었습니다.", safeApplicationId), req.url));
    }

    const now = new Date();
    const card = extractNiceCardInfo(approvedRaw);
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
            cardCompany: card?.issuerName ?? null,
            cardLabel: card?.cardName ?? null,
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
      await cancelNicePaymentByTid({
        tid,
        orderId,
        reason: "스트링 신청 결제 반영 실패",
        ...credentials,
      });
      await markFailed("결제 승인 후 신청서 반영에 실패했습니다.");
      return NextResponse.redirect(new URL(failUrl("UPDATE_FAILED", "카드/간편결제 반영에 실패했습니다.", safeApplicationId), req.url));
    }

    await sessions.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "approved",
          mongoOrderId: applicationId,
          niceAuthRaw: raw,
          niceApprovedRaw: approvedRaw,
          updatedAt: now,
        },
      },
    );

    return NextResponse.redirect(new URL(`/services/success?applicationId=${encodeURIComponent(applicationId)}`, req.url));
  } catch {
    return NextResponse.redirect(new URL(failUrl("PAYMENT_ERROR", "카드/간편결제 처리 중 오류가 발생했습니다.", safeApplicationId), req.url));
  }
}

export async function GET(req: Request) {
  return handleNiceStringingReturn(req);
}

export async function POST(req: Request) {
  return handleNiceStringingReturn(req);
}
