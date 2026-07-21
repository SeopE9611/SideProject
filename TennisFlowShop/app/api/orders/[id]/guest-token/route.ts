import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  hasGuestOrderLookupAccess,
  signOrderAccessToken,
  verifyGuestOrderLookupAccessToken,
  verifyOrderAccessToken,
} from "@/lib/auth.utils";

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderMode(): GuestOrderMode {
  const raw = (process.env.GUEST_ORDER_MODE ?? "on").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "on";
}

function orderNotAvailable() {
  return NextResponse.json(
    { success: false, code: "ORDER_NOT_AVAILABLE", error: "주문 정보를 확인할 수 없습니다." },
    { status: 404 },
  );
}

// POST /api/orders/:id/guest-token
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 주문 유형과 존재 여부를 노출하지 않는 동일한 접근 경계 응답이다.
    if (getGuestOrderMode() !== "on") return orderNotAvailable();

    const { id } = await params;
    if (!ObjectId.isValid(id)) return orderNotAvailable();

    const db = await getDb();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order || order.userId) return orderNotAvailable();

    const cookieStore = await cookies();
    const existing = verifyOrderAccessToken(cookieStore.get("orderAccessToken")?.value ?? "");
    const lookup = verifyGuestOrderLookupAccessToken(
      cookieStore.get("guestOrderLookupToken")?.value ?? "",
    );
    const hasExistingAccess = Boolean(
      existing && "orderId" in existing && existing.orderId === String(order._id),
    );
    if (!hasExistingAccess && !hasGuestOrderLookupAccess(lookup, String(order._id))) {
      return orderNotAvailable();
    }

    const token = signOrderAccessToken({ orderId: String(order._id) });
    const response = NextResponse.json({ success: true });
    response.cookies.set("orderAccessToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("[GUEST_ORDER_TOKEN_ERROR]", error);
    return NextResponse.json({ success: false, error: "서버 오류" }, { status: 500 });
  }
}
