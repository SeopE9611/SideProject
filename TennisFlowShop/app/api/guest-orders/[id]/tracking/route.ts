import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import {
  hasGuestOrderLookupAccess,
  verifyAccessToken,
  verifyGuestOrderLookupAccessToken,
  verifyOrderAccessToken,
} from "@/lib/auth.utils";
import {
  fetchDeliveryTrackerSummary,
  type DeliveryTrackerSummaryFailure,
} from "@/lib/shipping/delivery-tracker";
import {
  findCourierCatalogItem,
  getCourierDisplayName,
  mapCourierCodeToCarrierId,
  normalizeCourierCode,
} from "@/lib/shipping/courier-map";
import { normalizeTrackingNumber } from "@/lib/shipping/tracking-number";

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderMode(): GuestOrderMode {
  const raw = (process.env.GUEST_ORDER_MODE ?? "on").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "on";
}

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function getOrderIdClaim(claims: ReturnType<typeof verifyOrderAccessToken>) {
  return claims && "orderId" in claims ? claims.orderId : null;
}

function orderNotAvailable() {
  return NextResponse.json(
    { success: false, code: "ORDER_NOT_AVAILABLE", error: "주문 정보를 확인할 수 없습니다." },
    { status: 404 },
  );
}

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (getGuestOrderMode() === "off") return orderNotAvailable();

    const { id } = await params;
    if (!ObjectId.isValid(id)) return orderNotAvailable();

    const db = (await clientPromise).db();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });

    if (!order) return orderNotAvailable();

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const payload = safeVerifyAccessToken(token);

    if (order.userId) {
      if (!payload || payload.sub !== order.userId.toString()) return orderNotAvailable();
    } else {
      const orderAccessToken = cookieStore.get("orderAccessToken")?.value;
      const orderClaims = orderAccessToken ? verifyOrderAccessToken(orderAccessToken) : null;
      const lookupClaims = verifyGuestOrderLookupAccessToken(
        cookieStore.get("guestOrderLookupToken")?.value ?? "",
      );
      if (
        getOrderIdClaim(orderClaims) !== String(order._id) &&
        !hasGuestOrderLookupAccess(lookupClaims, String(order._id))
      ) {
        return orderNotAvailable();
      }
    }

    const courier = normalizeCourierCode(order?.shippingInfo?.invoice?.courier);
    const trackingNumber = normalizeTrackingNumber(
      order?.shippingInfo?.invoice?.trackingNumber ?? "",
    );

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, message: "운송장 번호가 등록되지 않았습니다." },
        { status: 400 },
      );
    }

    const courierItem = findCourierCatalogItem(courier);
    const carrierId = mapCourierCodeToCarrierId(courier);
    const carrierDisplayName = courierItem?.label ?? getCourierDisplayName(courier);
    if (!courierItem?.supportsTracking || !carrierId) {
      return NextResponse.json({
        success: true,
        supported: false,
        reason: "unsupported_courier",
        message: `${carrierDisplayName}은(는) 현재 자동 배송조회가 지원되지 않습니다.`,
      });
    }

    const clientId = process.env.DELIVERY_TRACKER_CLIENT_ID?.trim();
    const clientSecret = process.env.DELIVERY_TRACKER_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "배송조회 서비스 설정이 완료되지 않았습니다.",
        },
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
