export type OrderCancelFinalizationLike = {
  status?: string | null;
  paymentStatus?: string | null;
  paymentInfo?: {
    status?: string | null;
    niceSync?: {
      pgStatus?: string | null;
    } | null;
  } | null;
  paymentNiceSync?: {
    pgStatus?: string | null;
  } | null;
};

export function isExternallyCanceledPayment(order: OrderCancelFinalizationLike): boolean {
  return (
    order.paymentStatus === "결제취소" ||
    order.paymentInfo?.status === "canceled" ||
    order.paymentInfo?.status === "cancelled" ||
    order.paymentInfo?.niceSync?.pgStatus === "canceled" ||
    order.paymentInfo?.niceSync?.pgStatus === "cancelled" ||
    order.paymentNiceSync?.pgStatus === "canceled" ||
    order.paymentNiceSync?.pgStatus === "cancelled"
  );
}

export function isCancelFinalizedOrderStatus(status?: string | null): boolean {
  return ["취소", "취소완료", "취소승인", "결제취소", "환불", "환불완료"].includes(
    String(status ?? ""),
  );
}

export function needsOrderCancelFinalization(order: OrderCancelFinalizationLike): boolean {
  return isExternallyCanceledPayment(order) && !isCancelFinalizedOrderStatus(order.status);
}
