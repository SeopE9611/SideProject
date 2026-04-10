import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken, verifyOrderAccessToken } from "@/lib/auth.utils";
import {
  fetchDeliveryTrackerSummary,
  type DeliveryTrackerSummaryFailure,
} from "@/lib/shipping/delivery-tracker";
import {
  getCourierDisplayName,
  mapCourierCodeToCarrierId,
} from "@/lib/shipping/courier-map";

function externalFailureResponse(result: DeliveryTrackerSummaryFailure) {
  return NextResponse.json(
    {
      success: false,
      errorCode: result.errorCode,
      message: result.message,
    },
    { status: result.statusCode },
  );
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "BAD_ID" }, { status: 400 });
    }

    const db = (await clientPromise).db();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) {
      return NextResponse.json({ success: false, message: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const payload = token ? verifyAccessToken(token) : null;

    const isOwner = payload?.sub === order.userId?.toString();
    const isAdmin = payload?.role === "admin";

    const oax = cookieStore.get("orderAccessToken")?.value ?? null;
    const guestClaims = oax ? verifyOrderAccessToken(oax) : null;
    const isGuestOrder = !order.userId || (order as any).guest === true;
    const guestOwnsOrder = !!(
      isGuestOrder &&
      guestClaims &&
      (guestClaims as any).orderId === String(order._id)
    );

    if (!isOwner && !isAdmin && !guestOwnsOrder) {
      return NextResponse.json({ success: false, message: "권한이 없습니다." }, { status: 403 });
    }

    const courier = String(order?.shippingInfo?.invoice?.courier ?? "").trim().toLowerCase();
    const trackingNumber = String(order?.shippingInfo?.invoice?.trackingNumber ?? "").trim();

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, message: "운송장 번호가 등록되지 않았습니다." },
        { status: 400 },
      );
    }

    const carrierId = mapCourierCodeToCarrierId(courier);
    const carrierDisplayName = getCourierDisplayName(courier);
    if (!carrierId) {
      return NextResponse.json({
        success: true,
        supported: false,
        reason: "unsupported_courier",
        message: "현재 택배사는 자동 배송조회가 지원되지 않습니다.",
      });
    }

    const clientId = process.env.DELIVERY_TRACKER_CLIENT_ID?.trim();
    const clientSecret = process.env.DELIVERY_TRACKER_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, message: "배송조회 서비스 설정이 완료되지 않았습니다." },
        { status: 503 },
      );
    }

    const summary = await fetchDeliveryTrackerSummary({
      carrierId,
      trackingNumber,
      clientId,
      clientSecret,
      carrierDisplayName,
    });

    if (!summary.success) {
      return externalFailureResponse(summary);
    }

    return NextResponse.json({
      success: true,
      supported: true,
      carrierCode: courier,
      carrierId,
      carrierName: summary.carrierName ?? carrierDisplayName,
      trackingNumber,
      displayStatus: summary.displayStatus,
      stateId: summary.stateId,
      stateText: summary.stateText,
      linkUrl: summary.linkUrl,
      lastEvent: summary.lastEvent,
      progresses: summary.progresses,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 503 },
    );
  }
}
