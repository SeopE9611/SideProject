import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth.utils";
import { findBlockingPackageOrderByUserId } from "@/lib/package-order-ownership";

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
    const token = (await cookies()).get("accessToken")?.value ?? null;
    const user = safeVerifyAccessToken(token);
    if (!user?.sub) {
      return NextResponse.json({ hasBlockingPackage: false }, { status: 200 });
    }

    const blocking = await findBlockingPackageOrderByUserId(String(user.sub));
    if (!blocking) {
      return NextResponse.json({ hasBlockingPackage: false }, { status: 200 });
    }

    if (blocking.kind === "pending_order") {
      return NextResponse.json(
        {
          hasBlockingPackage: true,
          blockingKind: "pending_order",
          message:
            "진행 중인 패키지 주문(결제대기)이 있어 추가 구매할 수 없습니다. 기존 주문 상태를 먼저 확인해주세요.",
          blockingOrder: {
            id: blocking.pendingOrder._id.toString(),
            status: String(blocking.pendingOrder.status ?? ""),
            paymentStatus: String(blocking.pendingOrder.paymentStatus ?? ""),
            packageTitle: String((blocking.pendingOrder.packageInfo as any)?.title ?? ""),
            sessions: Number((blocking.pendingOrder.packageInfo as any)?.sessions ?? 0),
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        hasBlockingPackage: true,
        blockingKind: "active_pass",
        message:
          "현재 사용 가능한 패키지가 있어 추가 구매할 수 없습니다. 기존 패키지 이용이 종료된 뒤 다시 구매해주세요.",
        blockingPass: {
          id: blocking.activePass._id.toString(),
          status: String(blocking.activePass.status ?? ""),
          remainingCount: Number(blocking.activePass.remainingCount ?? 0),
          expiresAt: blocking.activePass.expiresAt ?? null,
          packageSize: Number(blocking.activePass.packageSize ?? 0),
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/packages/ownership] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
