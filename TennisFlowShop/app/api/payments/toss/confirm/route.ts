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
      return NextResponse.json({ success: false, code: "INVALID_QUERY", error: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = tossPaymentSessions(db);

    const session = await col.findOne({ tossOrderId: orderId });
    if (!session) {
      return NextResponse.json({ success: false, code: "SESSION_NOT_FOUND", error: "결제 세션을 찾을 수 없습니다." }, { status: 404 });
    }

    if (session.flowType && session.flowType !== "checkout_order") {
      return NextResponse.json({ success: false, code: "FLOW_TYPE_MISMATCH", error: "일반 체크아웃 결제 세션이 아닙니다." }, { status: 400 });
    }

    if (session.status === "approved" && session.mongoOrderId) {
      return NextResponse.json({ success: true, mongoOrderId: session.mongoOrderId, paymentKey: session.paymentKey ?? paymentKey });
    }

    if (session.status === "confirm_succeeded_order_failed") {
      return NextResponse.json(
        {
          success: false,
          code: "ORDER_CREATION_FAILED_AFTER_PAYMENT_CONFIRM",
          error:
            session.failureMessage ||
            "결제 승인 후 주문 처리에 실패한 상태가 이미 기록되어 있습니다. 중복 결제를 시도하지 말고 주문/결제 상태를 확인해주세요.",
        },
        { status: 409 },
      );
    }

    const now = new Date();
    if (session.expiresAt && session.expiresAt.getTime() < now.getTime()) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            failureStage: "session_expired_before_confirm",
            failureCode: "SESSION_EXPIRED",
            failureMessage: "결제 세션 유효시간이 만료되었습니다.",
            updatedAt: now,
          },
        },
      );
      return NextResponse.json({ success: false, code: "SESSION_EXPIRED", error: "결제 세션 유효시간이 만료되었습니다. 다시 결제를 시도해주세요." }, { status: 410 });
    }

    if (session.amount !== amount) {
      return NextResponse.json({ success: false, code: "AMOUNT_MISMATCH", error: "결제 금액 검증에 실패했습니다." }, { status: 400 });
    }

    if (!process.env.TOSS_WIDGET_SECRET_KEY) {
      return NextResponse.json({ success: false, code: "TOSS_SECRET_MISSING", error: "결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요." }, { status: 500 });
    }

    let confirmed: Awaited<ReturnType<typeof confirmTossPayment>>;
    try {
      confirmed = await confirmTossPayment({ paymentKey, orderId, amount });
    } catch (error: any) {
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "failed",
            paymentKey,
            failureStage: "confirm_payment",
            failureCode: "CONFIRM_FAILED",
            failureMessage: error?.message || "토스 결제 승인에 실패했습니다.",
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.json({ success: false, code: "CONFIRM_FAILED", error: error?.message || "토스 결제 승인에 실패했습니다." }, { status: 502 });
    }

    const confirmedPaymentSummary = {
      orderId: confirmed.orderId,
      method: confirmed.method,
      type: confirmed.type,
      totalAmount: Number(confirmed.totalAmount ?? amount),
      approvedAt: confirmed.approvedAt ? new Date(confirmed.approvedAt) : undefined,
      card: confirmed.card ? { issuerCode: confirmed.card.issuerCode, acquirerCode: confirmed.card.acquirerCode } : undefined,
      easyPay: confirmed.easyPay ? { provider: confirmed.easyPay.provider, amount: confirmed.easyPay.amount } : undefined,
    };

    const idemKey = `toss:${orderId}`;
    const orderReq = new Request("http://internal/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idemKey,
      },
      body: JSON.stringify(session.checkoutPayload ?? {}),
    });

    const orderRes = await createOrder(orderReq);
    const orderJson = await orderRes.json();
    if (!orderRes.ok || !orderJson?.orderId) {
      const failureMessage = orderJson?.error ?? "주문 생성에 실패했습니다.";
      await col.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "confirm_succeeded_order_failed",
            paymentKey,
            failureStage: "create_order_after_confirm",
            failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_CONFIRM",
            failureMessage,
            confirmedPaymentSummary,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.json(
        {
          success: false,
          code: "ORDER_CREATION_FAILED_AFTER_PAYMENT_CONFIRM",
          error: "결제 승인 후 주문 처리에 실패했습니다. 중복 결제를 방지하기 위해 주문/결제 상태를 확인해주세요.",
        },
        { status: 500 },
      );
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
          confirmedPaymentSummary,
          updatedAt: new Date(),
        },
        $unset: {
          failureStage: "",
          failureCode: "",
          failureMessage: "",
        },
      },
    );

    return NextResponse.json({ success: true, mongoOrderId, paymentKey });
  } catch (error) {
    return NextResponse.json({ success: false, code: "CONFIRM_ROUTE_ERROR", error: "토스 승인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
