import "server-only";

import type { AppsInTossPaymentIntentDocument } from "@/lib/apps-in-toss/server/payment-intents";
import type { AppsInTossObservedPaymentStatusClassification } from "./status-check";

type RecoveryDecision =
  | { kind: "recover_paid"; targetState: "paid" }
  | { kind: "recover_failed"; targetState: "failed" }
  | { kind: "recover_refunded"; targetState: "refunded" }
  | { kind: "wait"; reasonCode: "PAYMENT_PENDING" | "REFUND_PROGRESS"; message: string }
  | { kind: "blocked"; reasonCode: string; message: string };

const blocked = (reasonCode: string, message = "현재 증거로는 내부 결제 상태를 안전하게 자동 복구할 수 없습니다."): RecoveryDecision => ({ kind: "blocked", reasonCode, message });

export function classifyAppsInTossReconciliationRecovery({ intent, observedClassification }: {
  intent: AppsInTossPaymentIntentDocument; observedClassification: AppsInTossObservedPaymentStatusClassification;
  payStatus: string; refundableAmount: number;
}): RecoveryDecision {
  if (intent.state !== "reconciliation_required") return blocked("STATE_MISMATCH");
  if (intent.finalOrderId) return blocked("FINAL_ORDER_EXISTS");
  if (intent.isTestPayment) return blocked("TEST_PAYMENT_FORBIDDEN");
  if (intent.failureStage === "payment_status" && intent.failureCode === "PAYMENT_STATUS_UNCONFIRMED") {
    if (intent.finalization?.failureCode) return blocked("FINALIZATION_METADATA_INCONSISTENT");
    if (observedClassification === "payment_pending") return { kind: "wait", reasonCode: "PAYMENT_PENDING", message: "외부 결제가 아직 완료되지 않아 내부 상태를 변경하지 않았습니다. 잠시 후 다시 확인하세요." };
    if (observedClassification === "payment_cancelled") return { kind: "recover_failed", targetState: "failed" };
    if (observedClassification === "payment_complete" || observedClassification === "payment_settled") return { kind: "recover_paid", targetState: "paid" };
    return blocked("PAYMENT_RECOVERY_MATRIX_MISMATCH");
  }
  if (intent.failureStage === "refund_status" && intent.failureCode === "PAYMENT_REFUND_STATUS_UNCONFIRMED") {
    if (!intent.finalization?.failureCode) return blocked("FINALIZATION_METADATA_INCONSISTENT");
    if (observedClassification === "refund_progress") return { kind: "wait", reasonCode: "REFUND_PROGRESS", message: "외부 환불이 진행 중이어서 내부 상태를 변경하지 않았습니다. 잠시 후 다시 확인하세요." };
    if (observedClassification === "refund_complete" || observedClassification === "refund_settled") return { kind: "recover_refunded", targetState: "refunded" };
    return blocked(observedClassification === "refund_inconsistent" ? "REFUND_INCONSISTENT" : "REFUND_RECOVERY_MATRIX_MISMATCH");
  }
  return blocked("UNKNOWN_RECONCILIATION_METADATA");
}

export function parseObservedPaidAt(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
