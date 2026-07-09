export const normalizeStatusText = (status?: unknown) =>
  String(status ?? "").trim().toLowerCase();

const includesNormalized = <T extends readonly string[]>(values: T, status?: unknown) =>
  values.some((value) => normalizeStatusText(value) === normalizeStatusText(status));

export const ORDER_DELIVERED_MONITORING_VALUES = ["배송완료", "delivered"] as const;

export const ORDER_CONFIRMED_TERMINAL_VALUES = [
  "구매확정",
  "confirmed",
  "purchase_confirmed",
] as const;

export const ORDER_CANCELED_TERMINAL_VALUES = [
  "취소",
  "취소완료",
  "canceled",
  "cancelled",
] as const;

export const ORDER_REFUNDED_TERMINAL_VALUES = [
  "환불",
  "환불완료",
  "refunded",
  "refund_completed",
  "결제취소",
] as const;

export const STRINGING_COMPLETED_VALUES = [
  "교체완료",
  "completed",
  "done",
  "work_done",
] as const;

export const STRINGING_CANCELED_VALUES = [
  "취소",
  "canceled",
  "cancelled",
] as const;

export const RENTAL_RETURNED_VALUES = [
  "returned",
  "반납완료",
] as const;

export function isOrderDeliveredStatus(status?: unknown) {
  return includesNormalized(ORDER_DELIVERED_MONITORING_VALUES, status);
}

export function isOrderConfirmedStatus(status?: unknown) {
  return includesNormalized(ORDER_CONFIRMED_TERMINAL_VALUES, status);
}

export function isOrderCanceledStatus(status?: unknown) {
  return includesNormalized(ORDER_CANCELED_TERMINAL_VALUES, status);
}

export function isOrderRefundedStatus(status?: unknown) {
  return includesNormalized(ORDER_REFUNDED_TERMINAL_VALUES, status);
}

export function isOrderTerminalStatus(status?: unknown) {
  return (
    isOrderConfirmedStatus(status) || isOrderCanceledStatus(status) || isOrderRefundedStatus(status)
  );
}

export function isStringingCompletedStatus(status?: unknown) {
  return includesNormalized(STRINGING_COMPLETED_VALUES, status);
}

export function isStringingCanceledStatus(status?: unknown) {
  return includesNormalized(STRINGING_CANCELED_VALUES, status);
}

export function isRentalReturnedStatus(status?: unknown) {
  return includesNormalized(RENTAL_RETURNED_VALUES, status);
}
