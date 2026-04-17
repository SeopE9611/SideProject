import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { calculateCheckoutPayableAmount } from "@/lib/payments/toss/checkout-quote";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { buildNiceOrderName, createNiceOrderId } from "@/lib/payments/nice/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

function resolveClientId() {
  return String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
}

function resolveAppUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    if (!isNicePaymentsEnabled()) {
      return NextResponse.json(
        {
          success: false,
          code: "PAYMENT_PROVIDER_DISABLED",
          message: "현재 해당 결제수단은 사용할 수 없습니다.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const shippingInfo = body?.shippingInfo;

    if (!Array.isArray(items) || items.length === 0 || !shippingInfo) {
      return NextResponse.json({ success: false, error: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
    }

    const clientId = resolveClientId();
    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          code: "NICE_CONFIG_MISSING",
          error: "NicePay client key 설정이 누락되었습니다.",
        },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;
    const gomRaw = (process.env.GUEST_ORDER_MODE ?? "on").trim();
    const guestOrderMode =
      gomRaw === "off" || gomRaw === "legacy" || gomRaw === "on" ? gomRaw : "on";
    if (!userId && guestOrderMode !== "on") {
      return NextResponse.json(
        {
          success: false,
          code: "GUEST_ORDER_DISABLED",
          error: "비회원 주문은 현재 중단되었습니다. 로그인 후 주문해주세요.",
        },
        { status: 401 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const quote = await calculateCheckoutPayableAmount({
      db,
      userId,
      items,
      shippingInfo,
      pointsToUse: body?.pointsToUse,
      stringingApplicationInput: body?.stringingApplicationInput,
    });

    if (!Number.isFinite(quote.payableTotalPrice) || quote.payableTotalPrice <= 0) {
      return NextResponse.json({ success: false, code: "INVALID_AMOUNT", error: "최종 결제금액이 올바르지 않습니다." }, { status: 400 });
    }

    const orderId = createNiceOrderId();
    const amount = Math.floor(quote.payableTotalPrice);
    const goodsName = buildNiceOrderName(quote.itemsWithSnapshot.map((it) => ({ name: it.name, quantity: it.quantity })));
    const returnUrl = `${resolveAppUrl()}/api/payments/nice/return`;

    const buyerName = String(shippingInfo?.name ?? body?.guestInfo?.name ?? "").trim();
    const buyerTel = String(shippingInfo?.phone ?? body?.guestInfo?.phone ?? "").replace(/\D/g, "");
    const buyerEmail = String(body?.guestInfo?.email ?? body?.email ?? "").trim().toLowerCase();

    await ensureTossPaymentSessionIndexes(db);
    const col = tossPaymentSessions(db);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 30);

    await col.insertOne({
      provider: "nicepay",
      niceOrderId: orderId,
      amount,
      status: "ready",
      flowType: "checkout_order",
      checkoutPayload: body,
      userId,
      guestInfo: body?.guestInfo ?? null,
      nicePrepared: {
        clientId,
        orderId,
        returnUrl,
        goodsName,
        buyerName,
        buyerTel,
        buyerEmail,
      },
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      nice: {
        clientId,
        orderId,
        amount,
        goodsName,
        returnUrl,
        buyerName,
        buyerTel,
        buyerEmail,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Nice 결제 준비 중 오류가 발생했습니다." }, { status: 500 });
  }
}
