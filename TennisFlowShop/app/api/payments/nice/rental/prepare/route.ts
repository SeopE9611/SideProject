import { verifyAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
import { buildNiceOrderName, createNiceOrderId } from "@/lib/payments/nice/server";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";
import { getPointsSummary } from "@/lib/points.service";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

const POINT_UNIT = 100;

function resolveClientId() {
  return String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
}

function resolveAppUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
}

const BodySchema = z.object({
  racketId: z.string().trim().min(1),
  days: z.union([z.literal(7), z.literal(15), z.literal(30)]),
  pointsToUse: z.coerce.number().optional(),
  servicePickupMethod: z.enum(["SELF_SEND", "SHOP_VISIT", "delivery", "pickup"]).optional(),
  payment: z.object({ method: z.literal("nicepay") }).optional(),
  shipping: z.record(z.any()).optional(),
  refundAccount: z.object({
    bank: z.enum(["shinhan", "kookmin", "woori"]),
    account: z.string().trim().min(8),
    holder: z.string().trim().min(2),
  }),
  stringing: z.object({ requested: z.coerce.boolean().optional(), stringId: z.string().trim().optional() }).optional(),
  stringingApplicationInput: z.any().optional(),
  guestInfo: z.any().optional(),
});

export async function POST(req: Request) {
  try {
    if (!isNicePaymentsEnabled()) {
      return NextResponse.json({ success: false, code: "PAYMENT_PROVIDER_DISABLED", message: "현재 해당 결제수단은 사용할 수 없습니다." }, { status: 503 });
    }

    const clientId = resolveClientId();
    if (!clientId) {
      return NextResponse.json({ success: false, code: "NICE_CONFIG_MISSING", error: "NicePay client key 설정이 누락되었습니다." }, { status: 500 });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success || !ObjectId.isValid(parsed.data.racketId)) {
      return NextResponse.json({ success: false, error: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    let payload: { sub?: string } | null = null;
    if (token) {
      try { payload = verifyAccessToken(token); } catch { payload = null; }
    }
    const userId = payload?.sub ?? null;

    const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
    if (guestOrderMode !== "on" && !userId) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const racketObjectId = new ObjectId(parsed.data.racketId);
    const racket = await db.collection("used_rackets").findOne({ _id: racketObjectId });
    if (!racket) return NextResponse.json({ success: false, error: "라켓 없음" }, { status: 404 });

    const activeCount = await db.collection("rental_orders").countDocuments({ racketId: racketObjectId, status: { $in: ["paid", "out"] } });
    const rawQtyField = (racket as any).quantity;
    const hasStockQty = typeof rawQtyField === "number" && Number.isFinite(rawQtyField);
    const baseQty = hasStockQty ? Math.max(0, Math.trunc(rawQtyField)) : racket.status === "available" ? 1 : 0;
    const available = Math.max(0, baseQty - activeCount);
    if (available <= 0) return NextResponse.json({ success: false, error: "대여 불가 상태(재고 없음)" }, { status: 409 });

    let stringPrice = 0;
    let stringingFee = 0;
    if (parsed.data.stringing?.requested) {
      const sid = parsed.data.stringing?.stringId;
      if (!sid || !ObjectId.isValid(sid)) {
        return NextResponse.json({ success: false, error: "BAD_STRING_ID" }, { status: 400 });
      }
      const s = await db.collection("products").findOne({ _id: new ObjectId(sid) }, { projection: { price: 1, mountingFee: 1 } });
      if (!s) return NextResponse.json({ success: false, error: "STRING_NOT_FOUND" }, { status: 404 });
      stringPrice = Number((s as any)?.price ?? 0);
      stringingFee = Number((s as any)?.mountingFee ?? 0);
    }

    const feeMap = {
      7: (racket as any).rental?.fee?.d7 ?? 0,
      15: (racket as any).rental?.fee?.d15 ?? 0,
      30: (racket as any).rental?.fee?.d30 ?? 0,
    } as const;
    const fee = Number(feeMap[parsed.data.days] ?? 0);
    const deposit = Number((racket as any).rental?.deposit ?? 0);
    const originalTotal = deposit + fee + stringPrice + stringingFee;

    const requestedPoints = Math.max(0, Math.floor(Number(parsed.data.pointsToUse ?? 0)));
    const normalizedRequestedPointsToUse = Math.floor(requestedPoints / POINT_UNIT) * POINT_UNIT;
    if (!userId && normalizedRequestedPointsToUse > 0) {
      return NextResponse.json({ success: false, error: "LOGIN_REQUIRED_FOR_POINTS" }, { status: 401 });
    }

    let pointsUsed = 0;
    if (userId && normalizedRequestedPointsToUse > 0 && ObjectId.isValid(userId)) {
      const summary = await getPointsSummary(db, new ObjectId(userId));
      if (summary.debt > 0) return NextResponse.json({ success: false, error: "POINTS_DEBT_EXISTS" }, { status: 409 });
      const maxPointsByPolicy = Math.max(0, originalTotal - deposit);
      const maxSpendable = Math.min(summary.available, maxPointsByPolicy);
      pointsUsed = Math.min(normalizedRequestedPointsToUse, maxSpendable);
    }

    const amount = Math.floor(Math.max(0, originalTotal - pointsUsed));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, code: "INVALID_AMOUNT", error: "최종 결제금액이 올바르지 않습니다." }, { status: 400 });
    }

    const niceOrderId = createNiceOrderId();
    const goodsName = buildNiceOrderName([{ name: `${String((racket as any).brand ?? "")} ${String((racket as any).model ?? "")}`.trim() || "라켓 대여", quantity: 1 }]);
    const returnUrl = `${resolveAppUrl()}/api/payments/nice/rental/return`;

    await ensureTossPaymentSessionIndexes(db);
    const now = new Date();
    await tossPaymentSessions(db).insertOne({
      provider: "nicepay",
      niceOrderId,
      amount,
      status: "ready",
      flowType: "rental_order",
      rentalPayload: {
        ...(parsed.data as any),
        payment: { method: "nicepay" },
        pointsToUse: pointsUsed,
        guestInfo: parsed.data.guestInfo ?? null,
      },
      userId,
      guestInfo: parsed.data.guestInfo ?? null,
      nicePrepared: {
        clientId,
        orderId: niceOrderId,
        returnUrl,
        goodsName,
        buyerName: String((parsed.data.shipping as any)?.name ?? parsed.data.guestInfo?.name ?? "").trim(),
        buyerTel: String((parsed.data.shipping as any)?.phone ?? parsed.data.guestInfo?.phone ?? "").replace(/\D/g, ""),
        buyerEmail: String(parsed.data.guestInfo?.email ?? "").trim(),
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 30),
    });

    return NextResponse.json({
      success: true,
      nice: { clientId, orderId: niceOrderId, amount, goodsName, returnUrl },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "라켓 대여 Nice 결제 준비 중 오류가 발생했습니다." }, { status: 500 });
  }
}
