export type AppsInTossObservedPaymentStatusClassification =
  | "payment_pending"
  | "payment_cancelled"
  | "payment_complete"
  | "payment_settled"
  | "refund_progress"
  | "refund_complete"
  | "refund_settled"
  | "refund_inconsistent"
  | "unknown";

export function classifyAppsInTossObservedPaymentStatus(input: {
  payStatus: string;
  refundableAmount: number;
}): AppsInTossObservedPaymentStatusClassification {
  if (["PAY_STANDBY", "PAY_APPROVED", "PAY_PROGRESS"].includes(input.payStatus)) return "payment_pending";
  if (input.payStatus === "PAY_CANCEL") return "payment_cancelled";
  if (input.payStatus === "PAY_COMPLETE") return "payment_complete";
  if (input.payStatus === "SETTLEMENT_COMPLETE") return "payment_settled";
  if (input.payStatus === "REFUND_PROGRESS") return "refund_progress";
  if (input.payStatus === "REFUND_SUCCESS") return input.refundableAmount === 0 ? "refund_complete" : "refund_inconsistent";
  if (input.payStatus === "SETTLEMENT_REFUND_COMPLETE") return input.refundableAmount === 0 ? "refund_settled" : "refund_inconsistent";
  return "unknown";
}
