import { getCustomerTransactionPaymentStatusLabel } from "@/app/mypage/_lib/flow-display";
import { verifyAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
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
    const paymentToken = token(paymentStatus);
    const orderToken = token(order.status);
    const cancelled = ["결제취소", "취소", "canceled", "cancelled", "환불", "refunded"].includes(paymentToken) || ["취소", "cancelled", "환불", "refunded"].includes(orderToken);
    const failed = ["failed", "결제실패"].includes(paymentToken);
    const paymentStatusForDisplay = cancelled ? "결제취소" : failed ? "결제실패" : paymentStatus;
    const paymentStatusLabel = getCustomerTransactionPaymentStatusLabel({
      paymentStatus: paymentStatusForDisplay,
      paymentMethod,
      paymentProvider,
      totalPrice: paymentAmount,
    });
    const passStatus = text(pass?.status);
    const totalCount = number(pass?.packageSize) ?? number(order.packageInfo?.sessions);
    const usedCount = number(pass?.usedCount);
    const remainingCount = number(pass?.remainingCount);
    const expired = pass?.expiresAt ? new Date(pass.expiresAt).getTime() <= Date.now() : false;
    const usageStatus = cancelled
      ? "cancelled"
      : !pass
        ? "not_issued"
        : remainingCount !== null && remainingCount <= 0
          ? "exhausted"
          : expired || passStatus === "expired"
            ? "expired"
            : passStatus === "paused" || passStatus === "suspended"
              ? "paused"
              : passStatus === "active"
                ? "available"
                : "unknown";
    const usageStatusLabel = {
      available: "사용 가능",
      paused: "일시정지",
      exhausted: "횟수 소진",
      expired: "기간 만료",
      cancelled: "취소",
      not_issued: "아직 발급되지 않음",
      unknown: "상태 확인 중",
    }[usageStatus];
    const activationStatus = cancelled
      ? "cancelled"
      : failed
        ? "failed"
        : !pass
          ? ["pending", "결제대기", "paymentpending"].includes(paymentToken)
            ? "awaiting_payment"
            : ["paid", "결제완료", "paymentcompleted"].includes(paymentToken)
              ? "pending_issue"
              : "unknown"
          : usageStatus === "available"
            ? "active"
            : usageStatus === "paused"
              ? "paused"
              : "ended";
    const activationStatusLabel = {
      active: "활성화 완료",
      awaiting_payment: "결제 확인 후 활성화",
      pending_issue: "발급 처리 중",
      paused: "활성화 일시정지",
      ended: "이용 종료",
      cancelled: "활성화 취소",
      failed: "발급 처리 실패",
      unknown: "활성화 상태 확인 중",
    }[activationStatus];

    return NextResponse.json({
      item: {
        id,
        packageTitle: text(pass?.meta?.planTitle) ?? text(order.packageInfo?.title) ?? "교체서비스 패키지",
        orderedAt: order.createdAt ?? null,
        paymentAmount,
        paymentMethod,
        paymentProvider,
        paymentStatus,
        paymentStatusLabel,
        issued: Boolean(pass),
        activationStatus,
        activationStatusLabel,
        usageStatus,
        usageStatusLabel,
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
