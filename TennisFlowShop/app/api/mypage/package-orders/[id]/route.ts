import { getCustomerTransactionPaymentStatusLabel } from "@/app/mypage/_lib/flow-display";
import { verifyAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
import { getPaymentDisplaySummary } from "@/lib/payments/payment-display";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function token(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

type PaymentLifecycle =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "unknown";

function getPaymentLifecycle(paymentStatus: string | null, orderStatus: unknown): PaymentLifecycle {
  const paymentToken = token(paymentStatus);
  const orderToken = token(orderStatus);
  if (["refunded", "refund", "refundcompleted", "환불", "환불완료"].includes(paymentToken))
    return "refunded";
  if (["canceled", "cancelled", "결제취소", "취소"].includes(paymentToken)) return "cancelled";
  if (["refunded", "refund", "refundcompleted", "환불", "환불완료"].includes(orderToken))
    return "refunded";
  if (["canceled", "cancelled", "결제취소", "취소"].includes(orderToken)) return "cancelled";
  if (["failed", "결제실패", "paymentfailed"].includes(paymentToken)) return "failed";
  if (["paid", "결제완료", "paymentcompleted"].includes(paymentToken)) return "paid";
  if (["pending", "결제대기", "대기중", "paymentpending"].includes(paymentToken)) return "pending";
  return "unknown";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const viewer = safeVerifyAccessToken(cookieStore.get("accessToken")?.value);
    if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = typeof viewer.sub === "string" ? viewer.sub : "";
    if (userId.trim() !== userId || !ObjectId.isValid(userId))
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });

    const { id } = await params;
    if (!ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const db = (await clientPromise).db();
    const orderId = new ObjectId(id);
    const userObjectId = new ObjectId(userId);
    const order = await db.collection("packageOrders").findOne(
      { _id: orderId, userId: userObjectId },
      {
        projection: {
          createdAt: 1,
          status: 1,
          paymentStatus: 1,
          totalPrice: 1,
          packageInfo: 1,
          "paymentInfo.status": 1,
          "paymentInfo.method": 1,
          "paymentInfo.provider": 1,
          "paymentInfo.easyPayProvider": 1,
          "paymentInfo.cardDisplayName": 1,
          "paymentInfo.cardCompany": 1,
          "paymentInfo.cardLabel": 1,
          "paymentInfo.niceCard": 1,
        },
      },
    );
    if (!order) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const pass = await db.collection("service_passes").findOne(
      { orderId, userId: userObjectId },
      {
        projection: {
          packageSize: 1,
          usedCount: 1,
          remainingCount: 1,
          status: 1,
          purchasedAt: 1,
          activatedAt: 1,
          expiresAt: 1,
          meta: 1,
        },
      },
    );
    const usages = pass
      ? await db
          .collection("service_pass_consumptions")
          .find(
            { passId: pass._id },
            { projection: { _id: 0, applicationId: 1, usedAt: 1, count: 1, reverted: 1 } },
          )
          .sort({ usedAt: -1 })
          .limit(100)
          .toArray()
      : [];

    const paymentStatus = text(order.paymentStatus) ?? text(order.paymentInfo?.status);
    const paymentMethod = text(order.paymentInfo?.method);
    const paymentProvider = text(order.paymentInfo?.provider);
    const paymentAmount = number(order.totalPrice);
    const paymentLifecycle = getPaymentLifecycle(paymentStatus, order.status);
    const paymentStatusForDisplay =
      paymentLifecycle === "refunded"
        ? "환불"
        : paymentLifecycle === "cancelled"
          ? "결제취소"
          : paymentLifecycle === "failed"
            ? "결제실패"
            : paymentStatus;
    const paymentStatusLabel = getCustomerTransactionPaymentStatusLabel({
      paymentStatus: paymentStatusForDisplay,
      paymentMethod,
      paymentProvider,
      totalPrice: paymentAmount,
    });
    const paymentMethodLabel = getPaymentDisplaySummary({
      method: order.paymentInfo?.method,
      provider: order.paymentInfo?.provider,
      easyPayProvider: order.paymentInfo?.easyPayProvider,
      cardDisplayName: order.paymentInfo?.cardDisplayName,
      cardCompany: order.paymentInfo?.cardCompany,
      cardLabel: order.paymentInfo?.cardLabel,
      niceCard: order.paymentInfo?.niceCard,
    }).userLabel;
    const passStatus = text(pass?.status);
    const totalCount = number(pass?.packageSize) ?? number(order.packageInfo?.sessions);
    const usedCount = number(pass?.usedCount);
    const remainingCount = number(pass?.remainingCount);
    const expired = pass?.expiresAt ? new Date(pass.expiresAt).getTime() <= Date.now() : false;
    const rawUsageStatus = !pass
      ? "not_issued"
      : passStatus === "cancelled"
        ? "cancelled"
        : remainingCount !== null && remainingCount <= 0
          ? "exhausted"
          : expired || passStatus === "expired"
            ? "expired"
            : passStatus === "paused" || passStatus === "suspended"
              ? "paused"
              : passStatus === "active"
                ? "available"
                : "unknown";
    const usageStatus =
      paymentLifecycle === "refunded" || paymentLifecycle === "cancelled"
        ? "cancelled"
        : paymentLifecycle === "failed"
          ? "unknown"
          : rawUsageStatus;
    const usageStatusLabel =
      paymentLifecycle === "refunded"
        ? "환불 완료"
        : paymentLifecycle === "cancelled"
          ? "결제 취소"
          : paymentLifecycle === "failed"
            ? "결제 실패"
            : ({
                available: "사용 가능",
                paused: "일시정지",
                exhausted: "횟수 소진",
                expired: "기간 만료",
                cancelled: "취소",
                not_issued: "아직 발급되지 않음",
                unknown: "상태 확인 중",
              }[usageStatus]);
    const activationStatus =
      paymentLifecycle === "refunded" || paymentLifecycle === "cancelled"
        ? "cancelled"
        : paymentLifecycle === "failed"
          ? "failed"
          : !pass
            ? paymentLifecycle === "pending"
              ? "awaiting_payment"
              : paymentLifecycle === "paid"
                ? "pending_issue"
                : "unknown"
            : usageStatus === "available"
              ? "active"
              : usageStatus === "paused"
                ? "paused"
                : usageStatus === "exhausted" || usageStatus === "expired"
                  ? "ended"
                  : usageStatus === "cancelled"
                    ? "cancelled"
                    : "unknown";
    const activationStatusLabel =
      paymentLifecycle === "refunded"
        ? "환불로 이용 종료"
        : paymentLifecycle === "cancelled"
          ? "취소로 활성화 종료"
          : paymentLifecycle === "failed"
            ? "결제 실패로 미활성화"
            : ({
                active: "활성화 완료",
                awaiting_payment: "결제 확인 후 활성화",
                pending_issue: "발급 처리 중",
                paused: "활성화 일시정지",
                ended: "이용 종료",
                cancelled: "활성화 취소",
                failed: "발급 처리 실패",
                unknown: "활성화 상태 확인 중",
              }[activationStatus]);
    const canStartStringingService = paymentLifecycle === "paid" && usageStatus === "available";

    return NextResponse.json({
      item: {
        id,
        packageTitle: text(pass?.meta?.planTitle) ?? text(order.packageInfo?.title) ?? "교체서비스 패키지",
        orderedAt: order.createdAt ?? null,
        paymentAmount,
        paymentMethodLabel,
        paymentStatus,
        paymentStatusLabel,
        issued: Boolean(pass),
        activationStatus,
        activationStatusLabel,
        usageStatus,
        usageStatusLabel,
        canStartStringingService,
        totalCount,
        usedCount,
        remainingCount,
        expiresAt: pass?.expiresAt ?? null,
        usages: usages.map((usage) => ({
          applicationId: usage.applicationId ? String(usage.applicationId) : null,
          usedAt: usage.usedAt ?? null,
          count: number(usage.count) ?? 1,
          reverted: Boolean(usage.reverted),
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/mypage/package-orders/[id]] error", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
