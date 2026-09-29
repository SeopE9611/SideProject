import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { privatePayments } from "@/lib/private-payments";
import { createNiceOrderId } from "@/lib/payments/nice/server";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

const onlyDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const emailOk = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function clientId() {
  return String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
}
function appUrl() {
  return String(getBaseUrl()).trim().replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    if (!isNicePaymentsEnabled())
      return NextResponse.json(
        {
          success: false,
          code: "PAYMENT_PROVIDER_DISABLED",
          error: "현재 해당 결제수단은 사용할 수 없습니다.",
        },
        { status: 503 },
      );
    const cid = clientId();
    if (!cid)
      return NextResponse.json(
        {
          success: false,
          code: "NICE_CONFIG_MISSING",
          error: "카드/간편결제 설정이 누락되었습니다.",
        },
        { status: 500 },
      );
    const body = await req.json().catch(() => ({}));
    const privatePaymentId = String(body?.privatePaymentId ?? "").trim();
    if (!ObjectId.isValid(privatePaymentId))
      return NextResponse.json(
        { success: false, error: "잘못된 결제 링크입니다." },
        { status: 400 },
      );
    const buyer = body?.buyerInfo ?? {};
    const buyerInfo = {
      name: String(buyer?.name ?? "").trim(),
      phone: onlyDigits(buyer?.phone),
      email: String(buyer?.email ?? "").trim(),
    };
    if (buyerInfo.name.length < 1 || buyerInfo.phone.length < 8 || !emailOk(buyerInfo.email))
      return NextResponse.json(
        { success: false, error: "구매자 정보를 확인해 주세요." },
        { status: 400 },
      );
    const client = await clientPromise;
    const db = client.db();
    const doc = await privatePayments(db).findOne({ _id: new ObjectId(privatePaymentId) });
    if (
      !doc ||
      doc.status !== "active" ||
      doc.paymentStatus !== "결제대기" ||
      !Number.isInteger(doc.amount) ||
      doc.amount < 1000
    ) {
      return NextResponse.json(
        { success: false, error: "결제할 수 없는 링크입니다." },
        { status: 400 },
      );
    }
    if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: "만료된 결제 링크입니다." },
        { status: 400 },
      );
    }
    await ensureTossPaymentSessionIndexes(db);
    const niceOrderId = createNiceOrderId();
    const returnUrl = `${appUrl()}/api/payments/nice/private-payment/return`;
    const now = new Date();
    await tossPaymentSessions(db).insertOne({
      provider: "nicepay",
      niceOrderId,
      amount: doc.amount,
      status: "ready",
      flowType: "private_payment",
      userId: null,
      privatePaymentId,
      privatePaymentPayload: { title: doc.title, amount: doc.amount, buyerInfo },
      nicePrepared: {
        clientId: cid,
        orderId: niceOrderId,
        returnUrl,
        goodsName: doc.title,
        buyerName: buyerInfo.name,
        buyerTel: buyerInfo.phone,
        buyerEmail: buyerInfo.email,
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 30),
    });
    return NextResponse.json({
      success: true,
      nice: {
        clientId: cid,
        orderId: niceOrderId,
        amount: doc.amount,
        goodsName: doc.title,
        returnUrl,
        buyerName: buyerInfo.name,
        buyerTel: buyerInfo.phone,
        buyerEmail: buyerInfo.email,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "개인결제 준비 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
