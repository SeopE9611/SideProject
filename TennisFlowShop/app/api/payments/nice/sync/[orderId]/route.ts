import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth.utils";
import { syncNicePaymentByOrderId } from "@/lib/payments/nice/syncOrder";

export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
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

  const { orderId } = await params;
  return syncNicePaymentByOrderId(orderId);
}
