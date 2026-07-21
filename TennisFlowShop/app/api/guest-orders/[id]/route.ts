import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";
import {
  hasGuestOrderLookupAccess,
  verifyAccessToken,
  verifyGuestOrderLookupAccessToken,
  verifyOrderAccessToken,
} from "@/lib/auth.utils";
import { buildGuestOrderDetailDto } from "../_lib/guest-order-response";

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderMode(): GuestOrderMode {
  const raw = (process.env.GUEST_ORDER_MODE ?? "on").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "on";
}

function unavailable() {
  return NextResponse.json(
    { success: false, code: "ORDER_NOT_AVAILABLE", error: "주문 정보를 확인할 수 없습니다." },
    { status: 404 },
  );
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (getGuestOrderMode() === "off") return unavailable();

    const { id } = await params;
    if (!ObjectId.isValid(id)) return unavailable();

    const db = (await clientPromise).db();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) return unavailable();

    const store = await cookies();
    if (order.userId) {
      const user = verifyAccessToken(store.get("accessToken")?.value ?? "");
      if (!user || user.sub !== String(order.userId)) return unavailable();
    } else {
      const orderClaims = verifyOrderAccessToken(store.get("orderAccessToken")?.value ?? "");
      const lookupClaims = verifyGuestOrderLookupAccessToken(
        store.get("guestOrderLookupToken")?.value ?? "",
      );
      const hasOrderToken = Boolean(
        orderClaims && "orderId" in orderClaims && orderClaims.orderId === id,
      );
      if (!hasOrderToken && !hasGuestOrderLookupAccess(lookupClaims, id)) return unavailable();
    }

    const apps = await db
      .collection("stringing_applications")
      .find({ orderId: order._id, status: { $ne: "취소" } })
      .toArray();
    return NextResponse.json({ success: true, order: buildGuestOrderDetailDto(order, apps) });
  } catch (error) {
    console.error("[GUEST_ORDER_DETAIL_ERROR]", error);
    return NextResponse.json({ success: false, error: "서버 오류" }, { status: 500 });
  }
}
