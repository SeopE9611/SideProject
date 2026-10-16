import type { Document, Filter, MongoClient, Db } from "mongodb";
import { isExternallyCanceledPayment, isCancelFinalizedOrderStatus } from "@/lib/orders/cancel-finalization";
import { isOrderCanceledStatus, isOrderRefundedStatus } from "@/lib/status/flow-status";

// Compare exactly the state used to authorize cancellation/fulfillment. The
// entire request preserves its identity (requestedAt) and any PG claim token.
export function orderCancelSnapshot(order: Document): Filter<Document> {
  return {
    _id: order._id,
    status: order.status ?? null,
    paymentStatus: order.paymentStatus ?? null,
    "paymentInfo.provider": order.paymentInfo?.provider ?? null,
    "paymentInfo.status": order.paymentInfo?.status ?? null,
    "paymentInfo.tid": order.paymentInfo?.tid ?? null,
    cancelRequest: order.cancelRequest ?? null,
    "shippingInfo.shippingMethod": order.shippingInfo?.shippingMethod ?? null,
    "shippingInfo.estimatedDate": order.shippingInfo?.estimatedDate ?? null,
    "shippingInfo.invoice": order.shippingInfo?.invoice ?? null,
  };
}

export function isOrderPgCancelLocked(order: Document): boolean {
  return order.status === "취소처리중" ||
    isExternallyCanceledPayment(order) || isCancelFinalizedOrderStatus(order.status) ||
    isOrderCanceledStatus(order.status) || isOrderRefundedStatus(order.status) ||
    ["approved", "approved_pending_pg_cancel", "approved_pending_finalization"].includes(order.cancelRequest?.status) ||
    ["processing", "needs_reconciliation", "pg_canceled"].includes(order.cancelRequest?.pgCancelClaim?.status);
}

export function isOrderCancellationInFlight(order: Document): boolean {
  return order.cancelRequest?.status === "requested" || isOrderPgCancelLocked(order);
}

export class OrderCancelConflict extends Error {
  constructor(message = "다른 작업으로 주문 또는 연결 신청서가 변경되었습니다. 최신 상태를 확인해주세요.") {
    super(message);
  }
}

// Order-originated application requests use the same requestedAt/reason tuple
// as the order. Do not clear an independently created application request.
export async function persistOrderCancelDecision(
  client: MongoClient, db: Db, order: Document, update: Document,
  decision: "none" | "rejected", now: Date,
): Promise<void> {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const saved = await db.collection("orders").updateOne(orderCancelSnapshot(order), update as any, { session });
      if (!saved.matchedCount) throw new OrderCancelConflict();
      if (!order.cancelRequest?.requestedAt) return;
      const apps = db.collection("stringing_applications");
      const linked = await apps.find({
        orderId: { $in: [order._id, String(order._id)] },
        "cancelRequest.status": "요청",
        "cancelRequest.requestedAt": order.cancelRequest.requestedAt,
        "cancelRequest.reasonCode": order.cancelRequest.reasonCode ?? null,
        "cancelRequest.reasonText": order.cancelRequest.reasonText ?? null,
      }, { session }).toArray();
      for (const app of linked) {
        const savedApp = await apps.updateOne({
          _id: app._id, status: app.status ?? null, cancelRequest: app.cancelRequest,
        }, {
          $set: { "cancelRequest.status": decision, "cancelRequest.updatedAt": now },
          $push: { history: {
            status: decision === "none" ? "취소요청철회" : "취소요청거절", date: now,
            description: "연결 주문의 취소 요청 철회/거절을 함께 반영했습니다.",
          } },
        } as any, { session });
        if (!savedApp.matchedCount) throw new OrderCancelConflict();
      }
    });
  } finally {
    await session.endSession();
  }
}
