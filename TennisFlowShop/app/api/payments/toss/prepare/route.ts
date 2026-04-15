import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { calculateCheckoutPayableAmount } from "@/lib/payments/toss/checkout-quote";
import { isTossPaymentsEnabled } from "@/lib/payments/provider-flags";
import { buildTossOrderName, createTossOrderId } from "@/lib/payments/toss/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";

export async function POST(req: Request) {
  try {
    if (!isTossPaymentsEnabled()) {
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

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;

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

    const tossOrderId = createTossOrderId();
    const orderName = buildTossOrderName(quote.itemsWithSnapshot.map((it) => ({ name: it.name, quantity: it.quantity })));

    await ensureTossPaymentSessionIndexes(db);
    const col = tossPaymentSessions(db);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 30);

    await col.insertOne({
      provider: "toss",
      tossOrderId,
      amount: quote.payableTotalPrice,
      status: "ready",
      flowType: "checkout_order",
      checkoutPayload: body,
      userId,
      guestInfo: body?.guestInfo ?? null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      orderId: tossOrderId,
      amount: quote.payableTotalPrice,
      orderName,
      customerName: shippingInfo?.name ?? body?.guestInfo?.name ?? "",
      customerEmail: body?.guestInfo?.email ?? body?.email ?? "",
      customerMobilePhone: shippingInfo?.phone ?? body?.guestInfo?.phone ?? "",
      successUrl: `${appUrl}/checkout/toss/success`,
      failUrl: `${appUrl}/checkout/toss/fail`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "토스 결제 준비 중 오류가 발생했습니다." }, { status: 500 });
  }
}
