import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { confirmTossPayment } from "@/lib/payments/toss/server";
import { tossPaymentSessions } from "@/lib/payments/toss/session";
import { createOrder } from "@/app/features/orders/api/handlers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentKey = String(body?.paymentKey ?? "").trim();
    const orderId = String(body?.orderId ?? "").trim();
    const amount = Number(body?.amount ?? 0);

    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = tossPaymentSessions(db);

    const session = await col.findOne({ tossOrderId: orderId });
    if (!session) {
      return NextResponse.json({ success: false, error: "결제 세션을 찾을 수 없습니다." }, { status: 404 });
    }

    if (session.status === "approved" && session.mongoOrderId) {
      return NextResponse.json({ success: true, mongoOrderId: session.mongoOrderId, paymentKey: session.paymentKey ?? paymentKey });
    }

    if (session.amount !== amount) {
      return NextResponse.json({ success: false, error: "결제 금액 검증에 실패했습니다." }, { status: 400 });
    }

    const confirmed = await confirmTossPayment({ paymentKey, orderId, amount });

    const idemKey = `toss:${orderId}`;
    const orderReq = new Request("http://internal/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idemKey,
      },
      body: JSON.stringify(session.checkoutPayload),
    });

    const orderRes = await createOrder(orderReq);
    const orderJson = await orderRes.json();
    if (!orderRes.ok || !orderJson?.orderId) {
      return NextResponse.json({ success: false, error: orderJson?.error ?? "주문 생성에 실패했습니다." }, { status: 500 });
    }

    const mongoOrderId = String(orderJson.orderId);

    await db.collection("orders").updateOne(
      { _id: new ObjectId(mongoOrderId) },
      {
        $set: {
          paymentStatus: "결제완료",
          paymentInfo: {
            provider: "tosspayments",
            method: confirmed.method || confirmed.type || "CARD",
            status: "paid",
            paymentKey: confirmed.paymentKey,
            total: amount,
            approvedAt: confirmed.approvedAt ? new Date(confirmed.approvedAt) : new Date(),
            rawSummary: {
              orderId: confirmed.orderId,
              totalAmount: confirmed.totalAmount ?? amount,
              card: confirmed.card ? { issuerCode: confirmed.card.issuerCode, acquirerCode: confirmed.card.acquirerCode } : undefined,
              easyPay: confirmed.easyPay ? { provider: confirmed.easyPay.provider, amount: confirmed.easyPay.amount } : undefined,
            },
          },
          updatedAt: new Date(),
        },
      },
    );

    await col.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "approved",
          mongoOrderId,
          paymentKey,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({ success: true, mongoOrderId, paymentKey });
  } catch (error) {
    return NextResponse.json({ success: false, error: "토스 승인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
