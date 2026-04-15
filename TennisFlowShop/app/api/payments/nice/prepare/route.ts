import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { calculateCheckoutPayableAmount } from "@/lib/payments/toss/checkout-quote";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { buildNiceOrderName, createNiceEdiDate, createNiceMoid, createNiceSignData } from "@/lib/payments/nice/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";

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

    const mid = String(process.env.NICEPAY_MID ?? "").trim();
    const merchantKey = String(process.env.NICEPAY_MERCHANT_KEY ?? "").trim();
    if (!mid || !merchantKey) {
      return NextResponse.json(
        {
          success: false,
          code: "NICE_CONFIG_MISSING",
          error: "결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요.",
        },
        { status: 500 },
      );
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

    if (!Number.isFinite(quote.payableTotalPrice) || quote.payableTotalPrice <= 0) {
      return NextResponse.json({ success: false, code: "INVALID_AMOUNT", error: "최종 결제금액이 올바르지 않습니다." }, { status: 400 });
    }

    const moid = createNiceMoid();
    const amt = Math.floor(quote.payableTotalPrice);
    const ediDate = createNiceEdiDate();
    const signData = createNiceSignData({ ediDate, mid, amt, merchantKey });
    const orderName = buildNiceOrderName(quote.itemsWithSnapshot.map((it) => ({ name: it.name, quantity: it.quantity })));

    await ensureTossPaymentSessionIndexes(db);
    const col = tossPaymentSessions(db);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 30);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/api/payments/nice/return`;

    await col.insertOne({
      provider: "nicepay",
      niceMoid: moid,
      amount: amt,
      status: "ready",
      flowType: "checkout_order",
      checkoutPayload: body,
      userId,
      guestInfo: body?.guestInfo ?? null,
      nicePrepared: {
        mid,
        ediDate,
        signData,
        returnUrl,
      },
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      amount: amt,
      orderName,
      nice: {
        MID: mid,
        Moid: moid,
        Amt: String(amt),
        EdiDate: ediDate,
        SignData: signData,
        BuyerName: shippingInfo?.name ?? body?.guestInfo?.name ?? "",
        BuyerTel: shippingInfo?.phone ?? body?.guestInfo?.phone ?? "",
        BuyerEmail: body?.guestInfo?.email ?? body?.email ?? "",
        ReturnURL: returnUrl,
        GoodsName: orderName,
        MallReserved: "checkout_order",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Nice 결제 준비 중 오류가 발생했습니다." }, { status: 500 });
  }
}
