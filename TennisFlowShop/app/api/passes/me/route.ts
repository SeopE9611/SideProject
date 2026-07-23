import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCustomerTransactionPaymentStatusLabel } from "@/app/mypage/_lib/flow-display";

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function nullableTrim(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toValidDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function paymentToken(value: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isPendingPayment(token: string) {
  return ["pending", "결제대기", "paymentpending"].includes(token);
}
function isPaidPayment(token: string) {
  return ["paid", "결제완료", "paymentcompleted"].includes(token);
}
function isFailedPayment(token: string) {
  return ["failed", "결제실패"].includes(token);
}
function isCancelledPayment(token: string) {
  return [
    "결제취소",
    "취소",
    "canceled",
    "cancelled",
    "환불",
    "환불완료",
    "refunded",
    "refundcompleted",
  ].includes(token);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = typeof user.sub === "string" ? user.sub : "";
    if (userId.trim() !== userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const now = new Date();
    const userObjectId = new ObjectId(userId);

    const passes = await db
      .collection("service_passes")
      .find(
        { userId: userObjectId },
        {
          projection: {
            packageSize: 1,
            usedCount: 1,
            remainingCount: 1,
            status: 1,
            purchasedAt: 1,
            expiresAt: 1,
            meta: 1,
            orderId: 1,
            redemptions: { $slice: -3 },
          },
        },
      )
      .sort({ expiresAt: 1 })
      .limit(100)
      .toArray();

    const packageOrders = await db
      .collection("packageOrders")
      .find(
        { userId: userObjectId },
        {
          projection: {
            paymentStatus: 1,
            status: 1,
            createdAt: 1,
            totalPrice: 1,
            "paymentInfo.status": 1,
            "paymentInfo.method": 1,
            "paymentInfo.provider": 1,
            "paymentInfo.easyPayProvider": 1,
            "paymentInfo.approvedAt": 1,
            "packageInfo.id": 1,
            "packageInfo.title": 1,
            "packageInfo.sessions": 1,
            "packageInfo.validityPeriod": 1,
          },
        },
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(100)
      .toArray();

    const packageOrderById = new Map(packageOrders.map((order) => [String(order._id), order]));
    const issuedOrderIdSet = new Set(
      passes
        .map((p) => p.orderId)
        .filter(Boolean)
        .map(String),
    );

    const paymentFields = (order: (typeof packageOrders)[number] | undefined) => {
      const paymentStatus =
        nullableTrim(order?.paymentStatus) ?? nullableTrim(order?.paymentInfo?.status);
      const paymentMethod = nullableTrim(order?.paymentInfo?.method);
      const paymentProvider = nullableTrim(order?.paymentInfo?.provider);
      const paymentTotalAmount = toNullableFiniteNumber(order?.totalPrice);
      return {
        paymentStatus,
        paymentMethod,
        paymentProvider,
        paymentTotalAmount,
        paymentStatusLabel: getCustomerTransactionPaymentStatusLabel({
          paymentStatus,
          paymentMethod,
          paymentProvider,
          totalPrice: paymentTotalAmount,
        }),
      };
    };

    const passItems = passes.map((p) => {
      const orderId = p.orderId ? String(p.orderId) : null;
      const order = orderId ? packageOrderById.get(orderId) : undefined;
      const packageSize = toNullableFiniteNumber(p.packageSize);
      const usedCount = toNullableFiniteNumber(p.usedCount);
      const remainingCount = toNullableFiniteNumber(p.remainingCount);
      const payment = paymentFields(order);
      const paymentStatusToken = paymentToken(payment.paymentStatus);
      const orderStatusToken = paymentToken(nullableTrim(order?.status));
      const hasFailedPayment = isFailedPayment(paymentStatusToken);
      const hasCancelledOrRefundedPayment =
        isCancelledPayment(paymentStatusToken) || isCancelledPayment(orderStatusToken);
      const hasTerminalPaymentState = hasFailedPayment || hasCancelledOrRefundedPayment;
      const expiresAtDate = toValidDateOrNull(p.expiresAt);
      const endedByCount = remainingCount !== null && remainingCount <= 0;
      const expiredByTime = expiresAtDate !== null && expiresAtDate.getTime() <= now.getTime();
      const rawStatus = nullableTrim(p.status);
      const usageStatus =
        rawStatus === "cancelled"
          ? "cancelled"
          : endedByCount
            ? "exhausted"
            : expiredByTime || rawStatus === "expired"
              ? "expired"
              : rawStatus === "paused" || rawStatus === "suspended"
                ? "paused"
                : rawStatus === "active"
                  ? "available"
                  : "unknown";
      const usageStatusLabel = {
        available: "사용 가능",
        paused: "일시정지",
        exhausted: "횟수 소진",
        expired: "기간 만료",
        cancelled: "취소",
        unknown: "상태 확인 중",
      }[usageStatus];
      const activationStatus =
        usageStatus === "available"
          ? "active"
          : usageStatus === "paused"
            ? "paused"
            : usageStatus === "exhausted" || usageStatus === "expired"
              ? "ended"
              : usageStatus === "cancelled"
                ? "cancelled"
                : "unknown";
      const activationStatusLabel = {
        active: "활성화 완료",
        paused: "활성화 일시정지",
        ended: "이용 종료",
        cancelled: "활성화 취소",
        unknown: "활성화 상태 확인 중",
      }[activationStatus];
      const remainingMs = expiresAtDate ? expiresAtDate.getTime() - now.getTime() : null;
      return {
        id: String(p._id),
        packageSize,
        usedCount,
        remainingCount,
        status: rawStatus,
        rawStatus,
        purchasedAt: p.purchasedAt,
        expiresAt: expiresAtDate?.toISOString() ?? null,
        planId: nullableTrim(p.meta?.planId),
        planTitle: nullableTrim(p.meta?.planTitle),
        isExpiringSoon:
          usageStatus === "available" &&
          remainingMs !== null &&
          remainingMs >= 0 &&
          remainingMs <= 7 * 86400000,
        endedByCount,
        expiredByTime,
        recentUsages: (p.redemptions ?? []).map(
          (r: {
            applicationId?: { toString?: () => string };
            usedAt: unknown;
            reverted?: boolean;
          }) => ({
            applicationId: r.applicationId?.toString?.() ?? null,
            usedAt: r.usedAt,
            reverted: !!r.reverted,
          }),
        ),
        source: "pass",
        orderId,
        orderStatus: nullableTrim(order?.status),
        usageStatus,
        usageStatusLabel,
        ...payment,
        activationStatus,
        activationStatusLabel,
        displayGroup: hasTerminalPaymentState
          ? "history"
          : usageStatus === "available"
            ? "available"
            : usageStatus === "paused" || usageStatus === "unknown"
              ? "waiting"
              : "history",
      };
    });

    const pendingOrHistoryItems = packageOrders
      .filter((order) => !issuedOrderIdSet.has(String(order._id)))
      .map((order) => {
        const payment = paymentFields(order);
        const packageSize = toNullableFiniteNumber(order.packageInfo?.sessions);
        const token = paymentToken(payment.paymentStatus);
        const orderToken = paymentToken(nullableTrim(order.status));
        const cancelled = isCancelledPayment(token) || isCancelledPayment(orderToken);
        const failed = isFailedPayment(token);
        const activationStatus = cancelled
          ? "cancelled"
          : failed
            ? "failed"
            : isPendingPayment(token)
              ? "awaiting_payment"
              : isPaidPayment(token)
                ? "pending_issue"
                : "unknown";
        const activationStatusLabel = {
          awaiting_payment: "결제 확인 후 활성화",
          pending_issue: "발급 처리 중",
          failed: "발급 처리 실패",
          cancelled: "활성화 취소",
          unknown: "활성화 상태 확인 중",
        }[activationStatus];
        const usageStatus = cancelled ? "cancelled" : "not_issued";
        return {
          id: `order:${String(order._id)}`,
          packageSize,
          usedCount: null,
          remainingCount: null,
          status: activationStatus,
          rawStatus: nullableTrim(order.status),
          purchasedAt: order.createdAt,
          expiresAt: null,
          planId: nullableTrim(order.packageInfo?.id),
          planTitle: nullableTrim(order.packageInfo?.title),
          isExpiringSoon: false,
          recentUsages: [],
          source: "order",
          orderId: String(order._id),
          orderStatus: nullableTrim(order.status),
          usageStatus,
          usageStatusLabel: cancelled ? "취소" : "아직 발급되지 않음",
          ...payment,
          activationStatus,
          activationStatusLabel,
          displayGroup: cancelled || failed ? "history" : "waiting",
        };
      });

    return NextResponse.json({ items: [...passItems, ...pendingOrHistoryItems] });
  } catch (e) {
    console.error("[GET /api/passes/me] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
