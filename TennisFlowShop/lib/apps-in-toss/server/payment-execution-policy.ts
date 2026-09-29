import { isKnownTossPayStatus, type TossPayParsedResult } from "./toss-pay-contract";

type CanonicalPayment = { payToken: string; orderNo: string; amount: number };
type PaymentSuccess = { success: { payToken: string; orderNo: string; amount: number; mode: string } };

export function classifyTossPayStatus(status: string) {
  if (status === "PAY_COMPLETE") return "paid" as const;
  if (status === "PAY_CANCEL") return "cancelled" as const;
  if (status === "PAY_STANDBY" || status === "PAY_APPROVED" || status === "PAY_PROGRESS") return "pending" as const;
  return isKnownTossPayStatus(status) ? "other" as const : "unknown" as const;
}

export function matchesCanonicalLivePayment(result: TossPayParsedResult<PaymentSuccess>, canonical: CanonicalPayment) {
  if (result.kind !== "success") return false;
  const value = result.value.success;
  return value.payToken === canonical.payToken && value.orderNo === canonical.orderNo && value.amount === canonical.amount && value.mode === "LIVE";
}
