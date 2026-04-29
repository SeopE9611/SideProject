import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { extractNiceCardInfo, getNicePaymentByTid, summarizeNiceCardRaw } from "@/lib/payments/nice/server";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

function pick(raw: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function getNiceCredentials() {
  const clientKey = String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
  const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();
  const apiBaseUrl = String(process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments")
    .trim()
    .replace(/\/+$/, "");
  return { clientKey, secretKey, apiBaseUrl };
}

function normalizeNicePgStatus(rawStatus: string): string {
  const normalized = String(rawStatus ?? "").trim().toLowerCase();
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
    return { normalizedPgStatus, nextPaymentStatus: "결제완료", nextPaymentInfoStatus: "paid" };
  }
  if (normalizedPgStatus === "ready") {
    return { normalizedPgStatus, nextPaymentStatus: "결제대기", nextPaymentInfoStatus: "ready" };
  }
  if (normalizedPgStatus === "canceled") {
    return { normalizedPgStatus, nextPaymentStatus: "결제취소", nextPaymentInfoStatus: "canceled" };
  }
  if (normalizedPgStatus === "partialcanceled") {
    return { normalizedPgStatus, nextPaymentStatus: "부분취소", nextPaymentInfoStatus: "partialCanceled" };
  }
  if (normalizedPgStatus === "failed") {
    return { normalizedPgStatus, nextPaymentStatus: "결제실패", nextPaymentInfoStatus: "failed" };
  }

  return {
    normalizedPgStatus,
    nextPaymentStatus: previousPaymentStatus || "결제대기",
    nextPaymentInfoStatus: previousPaymentInfoStatus || null,
  };
}

export async function POST(_req: Request, { params }: { params: Promise<{ rentalId: string }> }) {
  try {
    const guard = await requireAdmin(_req);
    if (!guard.ok) return guard.res;

    const { rentalId } = await params;
    if (!ObjectId.isValid(rentalId)) {
      return NextResponse.json({ success: false, code: "INVALID_RENTAL_ID", error: "유효하지 않은 대여 ID입니다." }, { status: 400 });
    }

    const { clientKey, secretKey, apiBaseUrl } = getNiceCredentials();
    if (!clientKey || !secretKey) {
      return NextResponse.json({ success: false, code: "NICE_CONFIG_MISSING", error: "NicePay 설정이 누락되었습니다." }, { status: 500 });
    }

    const db = guard.db;
    const rental = await db.collection("rental_orders").findOne({ _id: new ObjectId(rentalId) });
    if (!rental) {
      return NextResponse.json({ success: false, code: "RENTAL_NOT_FOUND", error: "대여 주문을 찾을 수 없습니다." }, { status: 404 });
    }

    const provider = String((rental as any)?.paymentInfo?.provider ?? "").trim().toLowerCase();
    const tid = String((rental as any)?.paymentInfo?.tid ?? "").trim();
    if (!tid || provider !== "nicepay") {
      return NextResponse.json(
        { success: false, code: "NICE_PAYMENT_INFO_MISSING", error: "NicePay 결제 정보(tid/provider)가 없습니다." },
        { status: 400 },
      );
    }

    const pgRaw = await getNicePaymentByTid({ tid, clientKey, secretKey, apiBaseUrl });
    summarizeNiceCardRaw(pgRaw);

    const resultCode = pick(pgRaw, "resultCode", "ResultCode");
    const resultMsg = pick(pgRaw, "resultMsg", "ResultMsg");
    if (resultCode && resultCode !== "0000") {
      return NextResponse.json(
        { success: false, code: "NICE_SYNC_FAILED", error: resultMsg || "NicePay 상태 조회에 실패했습니다.", resultCode },
        { status: 502 },
      );
    }

    const pgStatus = pick(pgRaw, "status", "Status");
    const mapped = mapNicePgStatusToInternalPaymentStatus({
      pgStatusRaw: pgStatus,
      previousPaymentStatus: String((rental as any)?.paymentStatus ?? "").trim(),
      previousPaymentInfoStatus: String((rental as any)?.paymentInfo?.status ?? "").trim(),
    });

    const syncCardInfo = extractNiceCardInfo(pgRaw);
    const currentCardDisplayName = String((rental as any)?.paymentInfo?.cardDisplayName ?? "").trim();
    const currentCardCompany = String((rental as any)?.paymentInfo?.cardCompany ?? "").trim();
    const currentCardLabel = String((rental as any)?.paymentInfo?.cardLabel ?? "").trim();
    const currentNiceCard = (rental as any)?.paymentInfo?.niceCard ?? null;

    const nextCardDisplayName = currentCardDisplayName || syncCardInfo?.displayName || "";
    const nextCardCompany = currentCardCompany || syncCardInfo?.issuerName || "";
    const nextCardLabel = currentCardLabel || syncCardInfo?.cardName || "";
    const nextNiceCard = currentNiceCard || syncCardInfo || null;

    const cancelAmount = Math.floor(Number(pick(pgRaw, "cancAmt", "cancelAmount", "cancelAmt")) || 0);
    const canceledAt = pick(pgRaw, "canceledAt", "cancelledAt", "cancelDate", "cancelDt");
    const nowIso = new Date().toISOString();
    const beforeSummary = {
      paymentStatus: String((rental as any)?.paymentStatus ?? "").trim() || null,
      status: String((rental as any)?.status ?? "").trim() || null,
      niceSync: {
        lastSyncedAt: (rental as any)?.paymentInfo?.niceSync?.lastSyncedAt ?? null,
        pgStatus: (rental as any)?.paymentInfo?.niceSync?.pgStatus ?? null,
        resultCode: (rental as any)?.paymentInfo?.niceSync?.resultCode ?? null,
      },
      paymentInfo: {
        provider: String((rental as any)?.paymentInfo?.provider ?? "").trim() || null,
        method: String((rental as any)?.paymentInfo?.method ?? "").trim() || null,
        hasTid: Boolean(String((rental as any)?.paymentInfo?.tid ?? "").trim()),
      },
    };
    const changed =
      beforeSummary.paymentStatus !== mapped.nextPaymentStatus ||
      String((rental as any)?.paymentInfo?.status ?? "").trim() !== String(mapped.nextPaymentInfoStatus ?? "").trim() ||
      beforeSummary.niceSync.pgStatus !== (pgStatus || null);

    const updateResult = await db.collection("rental_orders").updateOne(
      { _id: new ObjectId(rentalId) },
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
          updatedAt: new Date().toISOString(),
        },
      },
    );
    await appendAdminAudit(
      db,
      {
        type: "rental.payment.nice_sync",
        actorId: guard.admin._id,
        targetId: new ObjectId(rentalId),
        message: "대여 NICEPay 수동 동기화 실행",
        diff: {
          targetType: "rental",
          actorEmail: guard.admin.email ?? null,
          actorName: guard.admin.name ?? null,
          actorRole: guard.admin.role ?? null,
          metadata: {
            actor: {
              id: String(guard.admin._id),
              email: guard.admin.email ?? null,
              name: guard.admin.name ?? null,
              role: guard.admin.role ?? "admin",
            },
          },
          before: beforeSummary,
          after: {
            paymentStatus: mapped.nextPaymentStatus,
            status: String((rental as any)?.status ?? "").trim() || null,
            niceSync: {
              lastSyncedAt: nowIso,
              pgStatus: pgStatus || null,
              resultCode: resultCode || "0000",
            },
            paymentInfo: {
              provider: String((rental as any)?.paymentInfo?.provider ?? "").trim() || null,
              method: String((rental as any)?.paymentInfo?.method ?? "").trim() || null,
              hasTid: Boolean(tid),
            },
          },
          syncResult: resultCode && resultCode !== "0000" ? "failure" : "success",
          pgResultCode: resultCode || "0000",
          pgStatus: pgStatus || null,
          changed,
          orderId: String((rental as any)?.orderId ?? "").trim() || null,
          hasTid: Boolean(tid),
          tidSuffix: tid ? tid.slice(-6) : null,
          modifiedCount: updateResult.modifiedCount,
        },
      },
      _req,
    );

    return NextResponse.json({
      success: true,
      rentalId,
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
        code: "NICE_RENTAL_SYNC_ROUTE_ERROR",
        error: error?.message || "대여 NicePay 상태 동기화 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
