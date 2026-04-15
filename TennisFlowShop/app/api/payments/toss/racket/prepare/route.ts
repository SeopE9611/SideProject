import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { calcShippingFee } from "@/lib/shipping-fee";
import {
  buildTossOrderName,
  createTossOrderId,
} from "@/lib/payments/toss/server";
import {
  ensureTossPaymentSessionIndexes,
  tossPaymentSessions,
} from "@/lib/payments/toss/session";

const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const racketId = String(body?.racketId ?? "").trim();

    const shippingInfo = body?.shippingInfo ?? {};
    const shippingMethod =
      shippingInfo?.shippingMethod === "visit" ? "visit" : "courier";

    const name = String(shippingInfo?.name ?? "").trim();
    const phone = onlyDigits(shippingInfo?.phone ?? "");
    const address = String(shippingInfo?.address ?? "").trim();
    const addressDetail = String(shippingInfo?.addressDetail ?? "").trim();
    const postalCode = onlyDigits(shippingInfo?.postalCode ?? "").trim();
    const deliveryRequest = String(shippingInfo?.deliveryRequest ?? "").trim();

    if (!ObjectId.isValid(racketId) || name.length < 2 || !/^010\d{8}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: "요청 데이터가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    if (shippingMethod === "courier") {
      if (!POSTAL_RE.test(postalCode) || !address) {
        return NextResponse.json(
          { success: false, error: "배송지 정보를 확인해주세요." },
          { status: 400 },
        );
      }
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    let payload: { sub?: string } | null = null;
    if (token) {
      try {
        payload = verifyAccessToken(token);
      } catch {
        payload = null;
      }
    }
    const userId = payload?.sub ?? null;

    const client = await clientPromise;
    const db = client.db();
    const racket = await db
      .collection("used_rackets")
      .findOne({ _id: new ObjectId(racketId) });

    if (!racket || racket.status !== "available") {
      return NextResponse.json(
        { success: false, error: "구매 가능한 라켓이 아닙니다." },
        { status: 400 },
      );
    }

    const racketPrice = Number(racket.price ?? 0);
    if (!Number.isFinite(racketPrice) || racketPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "라켓 가격 정보가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const shippingFee = calcShippingFee({
      subtotal: racketPrice,
      isVisitPickup: shippingMethod === "visit",
    });
    const totalPrice = racketPrice + shippingFee;

    const tossOrderId = createTossOrderId();
    const now = new Date();

    await ensureTossPaymentSessionIndexes(db);
    await tossPaymentSessions(db).insertOne({
      tossOrderId,
      amount: totalPrice,
      status: "ready",
      flowType: "racket_order",
      racketPayload: {
        racketId,
        items: [{ productId: racketId, quantity: 1, kind: "racket" }],
        shippingInfo: {
          name,
          phone,
          address,
          addressDetail,
          postalCode,
          // createOrder 스키마 호환을 위해 최소값 저장
          depositor: name,
          deliveryRequest,
          shippingMethod,
        },
        servicePickupMethod: shippingMethod,
        shippingFee,
        totalPrice,
        paymentInfo: { bank: "shinhan" },
        guestInfo: body?.guestInfo ?? null,
      },
      userId,
      guestInfo: body?.guestInfo ?? null,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 30),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const orderName = buildTossOrderName([
      {
        name: `${String(racket.brand ?? "")}${racket.model ? ` ${String(racket.model)}` : ""}`.trim(),
        quantity: 1,
      },
    ]);

    return NextResponse.json({
      success: true,
      orderId: tossOrderId,
      amount: totalPrice,
      orderName,
      customerName: name,
      customerEmail: String(body?.guestInfo?.email ?? ""),
      customerMobilePhone: phone,
      successUrl: `${appUrl}/rackets/toss/success?racketId=${encodeURIComponent(racketId)}`,
      failUrl: `${appUrl}/rackets/toss/fail?racketId=${encodeURIComponent(racketId)}`,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "라켓 토스 결제 준비 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
