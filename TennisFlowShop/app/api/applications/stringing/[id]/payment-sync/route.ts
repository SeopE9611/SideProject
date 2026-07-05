import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import {
  extractNiceCardInfo,
  getNicePaymentByTid,
  summarizeNiceCardRaw,
} from "@/lib/payments/nice/server";

function pick(raw: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function getNiceCredentials() {
  const clientKey = String(
    process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "",
  ).trim();
  const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();
  const apiBaseUrl = String(
    process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments",
  )
    .trim()
    .replace(/\/+$/, "");
  return { clientKey, secretKey, apiBaseUrl };
}

function normalizeNicePgStatus(rawStatus: string): string {
  const normalized = String(rawStatus ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  if (normalized === "cancelled") return "canceled";
  if (normalized === "partialcancelled") return "partialcanceled";
  return normalized;
}

function mapNicePgStatusToInternalPaymentStatus(params: {
  pgStatusRaw: string;
  previousPaymentStatus: string;
  previousPaymentInfoStatus: string;
}) {
  const normalizedPgStatus = normalizeNicePgStatus(params.pgStatusRaw);
  const previousPaymentStatus = String(params.previousPaymentStatus ?? "").trim();
  const previousPaymentInfoStatus = String(params.previousPaymentInfoStatus ?? "").trim();

  if (normalizedPgStatus === "paid") {
    return {
      normalizedPgStatus,
      nextPaymentStatus: "결제완료",
      nextPaymentInfoStatus: "paid",
    };
  }
  if (normalizedPgStatus === "ready") {
    return {
      normalizedPgStatus,
      nextPaymentStatus: "결제대기",
      nextPaymentInfoStatus: "ready",
    };
  }
  if (normalizedPgStatus === "canceled") {
    return {
      normalizedPgStatus,
      nextPaymentStatus: "결제취소",
      nextPaymentInfoStatus: "canceled",
    };
  }
  if (normalizedPgStatus === "partialcanceled") {
    return {
      normalizedPgStatus,
      nextPaymentStatus: "부분취소",
      nextPaymentInfoStatus: "partialCanceled",
    };
  }
  if (normalizedPgStatus === "failed") {
    return {
      normalizedPgStatus,
      nextPaymentStatus: "결제실패",
      nextPaymentInfoStatus: "failed",
    };
  }

  return {
    normalizedPgStatus,
    nextPaymentStatus: previousPaymentStatus || "결제대기",
    nextPaymentInfoStatus: previousPaymentInfoStatus || null,
  };
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    if (!ObjectId.isValid(applicationId)) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_APPLICATION_ID",
          error: "유효하지 않은 신청서 ID입니다.",
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    let payload: any = null;
    try {
      payload = token ? verifyAccessToken(token) : null;
    } catch {
      payload = null;
    }
    if (!payload?.sub || payload?.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          code: "FORBIDDEN",
          error: "관리자 권한이 필요합니다.",
        },
        { status: 403 },
      );
    }

    const { clientKey, secretKey, apiBaseUrl } = getNiceCredentials();
    if (!clientKey || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          code: "NICE_CONFIG_MISSING",
          error: "NicePay 설정이 누락되었습니다.",
        },
        { status: 500 },
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const application = await db
      .collection("stringing_applications")
      .findOne({ _id: new ObjectId(applicationId) });
    if (!application) {
      return NextResponse.json(
        {
          success: false,
          code: "APPLICATION_NOT_FOUND",
          error: "신청서를 찾을 수 없습니다.",
        },
        { status: 404 },
      );
    }

    const paymentSource = String((application as any)?.paymentSource ?? "").trim();
    if (
      (application as any)?.orderId ||
      (application as any)?.rentalId ||
      paymentSource.startsWith("order:") ||
      paymentSource.startsWith("rental:")
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "LINKED_APPLICATION_PAYMENT_SYNC_FORBIDDEN",
          error: "주문/대여와 연결된 신청서는 연결된 주문/대여 상세에서 PG 상태를 확인해주세요.",
        },
        { status: 409 },
      );
    }

    const tid = String((application as any)?.paymentInfo?.tid ?? "").trim();
    const provider = String((application as any)?.paymentInfo?.provider ?? "")
      .trim()
      .toLowerCase();
    if (!tid || provider !== "nicepay") {
      return NextResponse.json(
        {
          success: false,
          code: "NICE_PAYMENT_INFO_MISSING",
          error: "NicePay 결제 정보(tid/provider)가 없습니다.",
        },
        { status: 400 },
      );
    }

    console.info("[nicepay][sync]", { stage: "before_sync", applicationId, tid });
    const pgRaw = await getNicePaymentByTid({
      tid,
      clientKey,
      secretKey,
      apiBaseUrl,
    });
    const syncRawSummary = summarizeNiceCardRaw(pgRaw);
    console.info("[nicepay][card][sync_raw_keys]", {
      applicationId,
      tid,
      topLevelKeys: syncRawSummary.topLevelKeys,
      presentCardCandidateKeys: syncRawSummary.presentCandidateKeys,
    });
    const resultCode = pick(pgRaw, "resultCode", "ResultCode");
    const resultMsg = pick(pgRaw, "resultMsg", "ResultMsg");
    if (resultCode && resultCode !== "0000") {
      console.error("[nicepay][sync]", {
        stage: "sync_failed",
        applicationId,
        tid,
        resultCode,
        resultMsg,
      });
      return NextResponse.json(
        {
          success: false,
          code: "NICE_SYNC_FAILED",
          error: resultMsg || "NicePay 상태 조회에 실패했습니다.",
          resultCode,
        },
        { status: 502 },
      );
    }

    const pgStatus = pick(pgRaw, "status", "Status");
    const previousPaymentStatus = String((application as any)?.paymentStatus ?? "").trim();
    const previousPaymentInfoStatus = String(
      (application as any)?.paymentInfo?.status ?? "",
    ).trim();
    const cancelAmount = Math.floor(
      Number(pick(pgRaw, "cancAmt", "cancelAmount", "cancelAmt")) || 0,
    );
    const canceledAt = pick(pgRaw, "canceledAt", "cancelledAt", "cancelDate", "cancelDt");
    const mapped = mapNicePgStatusToInternalPaymentStatus({
      pgStatusRaw: pgStatus,
      previousPaymentStatus,
      previousPaymentInfoStatus,
    });
    const syncCardInfo = extractNiceCardInfo(pgRaw);
    console.info("[nicepay][card][sync_extract]", {
      applicationId,
      tid,
      hasNiceCard: Boolean(syncCardInfo),
      cardDisplayName: Boolean(syncCardInfo?.displayName),
      cardCompany: Boolean(syncCardInfo?.issuerName),
      cardLabel: Boolean(syncCardInfo?.cardName),
    });
    const currentCardDisplayName = String(
      (application as any)?.paymentInfo?.cardDisplayName ?? "",
    ).trim();
    const currentCardCompany = String((application as any)?.paymentInfo?.cardCompany ?? "").trim();
    const currentCardLabel = String((application as any)?.paymentInfo?.cardLabel ?? "").trim();
    const currentNiceCard = (application as any)?.paymentInfo?.niceCard ?? null;

    const nextCardDisplayName = currentCardDisplayName || syncCardInfo?.displayName || "";
    const nextCardCompany = currentCardCompany || syncCardInfo?.issuerName || "";
    const nextCardLabel = currentCardLabel || syncCardInfo?.cardName || "";
    const nextNiceCard = currentNiceCard || syncCardInfo || null;
    console.info("[nicepay][card][persist_summary]", {
      applicationId,
      tid,
      source: "manual_sync_api",
      existing: {
        cardDisplayName: Boolean(currentCardDisplayName),
        cardCompany: Boolean(currentCardCompany),
        cardLabel: Boolean(currentCardLabel),
        niceCard: Boolean(currentNiceCard),
      },
      next: {
        cardDisplayName: Boolean(nextCardDisplayName),
        cardCompany: Boolean(nextCardCompany),
        cardLabel: Boolean(nextCardLabel),
        niceCard: Boolean(nextNiceCard),
        rawSummaryCard: Boolean(nextNiceCard),
      },
    });
    console.info("[nicepay][sync]", {
      stage: "sync_mapping",
      applicationId,
      tid,
      pgStatusRaw: pgStatus || null,
      normalizedPgStatus: mapped.normalizedPgStatus || null,
      previousPaymentStatus: previousPaymentStatus || null,
      nextPaymentStatus: mapped.nextPaymentStatus,
      previousPaymentInfoStatus: previousPaymentInfoStatus || null,
      nextPaymentInfoStatus: mapped.nextPaymentInfoStatus,
    });

    const nowIso = new Date().toISOString();
    const updateResult = await db.collection("stringing_applications").updateOne(
      { _id: new ObjectId(applicationId) },
      {
        $set: {
          paymentStatus: mapped.nextPaymentStatus,
          "paymentInfo.status": mapped.nextPaymentInfoStatus,
          ...(nextCardDisplayName ? { "paymentInfo.cardDisplayName": nextCardDisplayName } : {}),
          ...(nextCardCompany ? { "paymentInfo.cardCompany": nextCardCompany } : {}),
          ...(nextCardLabel ? { "paymentInfo.cardLabel": nextCardLabel } : {}),
          ...(nextNiceCard ? { "paymentInfo.niceCard": nextNiceCard } : {}),
          ...(nextNiceCard
            ? {
                "paymentInfo.rawSummary.card": {
                  cardName: nextNiceCard.cardName ?? undefined,
                  issuerName: nextNiceCard.issuerName ?? undefined,
                  issuerCode: nextNiceCard.issuerCode ?? undefined,
                  acquirerName: nextNiceCard.acquirerName ?? undefined,
                  acquirerCode: nextNiceCard.acquirerCode ?? undefined,
                  cardCode: nextNiceCard.cardCode ?? undefined,
                },
              }
            : {}),
          "paymentInfo.niceSync": {
            lastSyncedAt: nowIso,
            source: "manual_sync_api",
            pgStatus: pgStatus || null,
            resultCode: resultCode || "0000",
            resultMsg: resultMsg || null,
            canceledAt: canceledAt || null,
            cancelAmount,
          },
          updatedAt: new Date(),
        },
      },
    );
    console.info("[nicepay][sync]", {
      stage: "after_sync",
      applicationId,
      tid,
      pgStatus: pgStatus || null,
      paymentStatus: mapped.nextPaymentStatus,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
    });

    return NextResponse.json({
      success: true,
      applicationId,
      tid,
      pgStatus: pgStatus || null,
      paymentStatus: mapped.nextPaymentStatus,
      paymentInfoStatus: mapped.nextPaymentInfoStatus,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        code: "NICE_STRINGING_SYNC_ROUTE_ERROR",
        error: error?.message || "NicePay 상태 동기화 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
