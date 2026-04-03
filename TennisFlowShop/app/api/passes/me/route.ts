import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  isCountEnded,
  isTimeExpired,
} from "@/lib/pass-status";

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = verifyAccessToken(token);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = String((user as any).sub ?? "");
    if (!ObjectId.isValid(userId))
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 400 },
      );

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
            "packageInfo.id": 1,
            "packageInfo.title": 1,
            "packageInfo.sessions": 1,
          },
        },
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(100)
      .toArray();

    const issuedOrderIdSet = new Set(
      passes
        .map((p: any) => p.orderId)
        .filter(Boolean)
        .map((id: any) => String(id)),
    );

    const passItems = passes.map((p: any) => {
      const endedByCount = isCountEnded(p.remainingCount);
      const expiredByTime = isTimeExpired(p.expiresAt, now);
      const computedStatus =
        p.status === "cancelled"
          ? "cancelled"
          : endedByCount
            ? "ended"
            : expiredByTime
              ? "expired"
              : p.status;

      return {
      id: p._id.toString(),
      packageSize: p.packageSize,
      usedCount: p.usedCount,
      remainingCount: p.remainingCount,
      status: computedStatus,
      rawStatus: p.status,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt,
      planId: p.meta?.planId ?? null,
      planTitle: p.meta?.planTitle ?? null,
      isExpiringSoon:
        computedStatus === "active" &&
        new Date(p.expiresAt).getTime() - now.getTime() <= 7 * 86400000,
      endedByCount,
      expiredByTime,
      recentUsages: (p.redemptions ?? []).map((r: any) => ({
        applicationId: r.applicationId?.toString?.() ?? null,
        usedAt: r.usedAt,
        reverted: !!r.reverted,
      })),
      source: "pass",
    }});

    const pendingOrHistoryItems = packageOrders
      .filter((order: any) => !issuedOrderIdSet.has(String(order._id)))
      .map((order: any) => {
        const paymentStatus = String(order.paymentStatus ?? "").trim();
        const orderStatus = String(order.status ?? "").trim();

        // 사용자 화면에서는 운영/결제 상태를 단순화해 이해 가능한 상태로 보여준다.
        let status: "pending_payment" | "pending_activation" | "cancelled" =
          "pending_activation";
        if (paymentStatus === "결제대기") status = "pending_payment";
        else if (
          paymentStatus === "결제취소" ||
          paymentStatus === "환불" ||
          orderStatus === "취소" ||
          orderStatus === "환불"
        )
          status = "cancelled";

        return {
          id: `order:${order._id.toString()}`,
          packageSize: Number(order.packageInfo?.sessions ?? 0),
          usedCount: 0,
          remainingCount: Number(order.packageInfo?.sessions ?? 0),
          status,
          purchasedAt: order.createdAt,
          expiresAt: null,
          planId: order.packageInfo?.id ?? null,
          planTitle: order.packageInfo?.title ?? null,
          isExpiringSoon: false,
          recentUsages: [],
          source: "order",
          paymentStatus,
        };
      });

    return NextResponse.json({
      items: [...passItems, ...pendingOrHistoryItems],
    });
  } catch (e) {
    console.error("[GET /api/passes/me] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
