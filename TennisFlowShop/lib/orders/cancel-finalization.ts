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

export const EXTERNALLY_CANCELED_PAYMENT_STATUS = "결제취소";
export const EXTERNALLY_CANCELED_PAYMENT_INFO_STATUSES = ["canceled", "cancelled"] as const;
export const CANCEL_FINALIZED_ORDER_STATUS_VALUES = [
  "취소",
  "취소완료",
  "취소승인",
  "결제취소",
  "환불",
  "환불완료",
] as const;

export function isExternallyCanceledPayment(order: OrderCancelFinalizationLike): boolean {
  return (
    order.paymentStatus === EXTERNALLY_CANCELED_PAYMENT_STATUS ||
    EXTERNALLY_CANCELED_PAYMENT_INFO_STATUSES.some(
      (status) => order.paymentInfo?.status === status,
    ) ||
    EXTERNALLY_CANCELED_PAYMENT_INFO_STATUSES.some(
      (status) => order.paymentInfo?.niceSync?.pgStatus === status,
    ) ||
    EXTERNALLY_CANCELED_PAYMENT_INFO_STATUSES.some(
      (status) => order.paymentNiceSync?.pgStatus === status,
    )
  );
}

export function isCancelFinalizedOrderStatus(status?: string | null): boolean {
  return CANCEL_FINALIZED_ORDER_STATUS_VALUES.includes(
    String(status ?? "") as (typeof CANCEL_FINALIZED_ORDER_STATUS_VALUES)[number],
  );
}

export function needsOrderCancelFinalization(order: OrderCancelFinalizationLike): boolean {
  return isExternallyCanceledPayment(order) && !isCancelFinalizedOrderStatus(order.status);
}
