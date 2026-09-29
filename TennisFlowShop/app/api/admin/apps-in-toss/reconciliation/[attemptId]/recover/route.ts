import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { completeAppsInTossPayment } from "@/lib/apps-in-toss/server/payment-completion";
import { findAppsInTossPaymentIntentByAttemptId, recoverAppsInTossPaymentReconciliation } from "@/lib/apps-in-toss/server/payment-intents";
import { assertAttemptId } from "@/lib/apps-in-toss/server/toss-pay-contract";
import type { AppsInTossAdminRecoveryResponse } from "@/types/admin/apps-in-toss-reconciliation";
import { classifyAppsInTossReconciliationRecovery, parseObservedPaidAt } from "../../../_lib/recovery";
import { AppsInTossStatusObservationError, observeAppsInTossPaymentStatus } from "../../../_lib/status-observation";
import { classifyAppsInTossObservedPaymentStatus } from "../../../_lib/status-check";

export const runtime = "nodejs";
export const maxDuration = 60;

const apiError = (status: number, code: string, message = "결제 대사 상태를 안전하게 복구할 수 없습니다.") => NextResponse.json({ ok: false, code, message }, { status });

export async function POST(req: Request, context: { params: Promise<{ attemptId: string }> }) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const { attemptId: rawAttemptId } = await context.params;
  let attemptId: string;
  try { assertAttemptId(rawAttemptId); attemptId = rawAttemptId; } catch { return apiError(400, "INVALID_ATTEMPT_ID"); }
  const intent = await findAppsInTossPaymentIntentByAttemptId(guard.db, attemptId);
  if (!intent) return apiError(404, "PAYMENT_INTENT_NOT_FOUND");
  if (intent.state !== "reconciliation_required" || intent.finalOrderId || intent.isTestPayment ||
      !((intent.failureStage === "payment_status" && intent.failureCode === "PAYMENT_STATUS_UNCONFIRMED" && !intent.finalization?.failureCode) ||
        (intent.failureStage === "refund_status" && intent.failureCode === "PAYMENT_REFUND_STATUS_UNCONFIRMED" && Boolean(intent.finalization?.failureCode)))) {
    return apiError(409, "RECONCILIATION_RECOVERY_NOT_ELIGIBLE");
  }
  let observed: Awaited<ReturnType<typeof observeAppsInTossPaymentStatus>>;
  try { observed = await observeAppsInTossPaymentStatus({ db: guard.db, intent }); }
  catch (observationError) {
    const known = observationError instanceof AppsInTossStatusObservationError ? observationError : new AppsInTossStatusObservationError(502, "TOSS_PAYMENT_STATUS_CHECK_FAILED");
    return apiError(known.status, known.code);
  }
  const classification = classifyAppsInTossObservedPaymentStatus(observed);
  const decision = classifyAppsInTossReconciliationRecovery({ intent, observedClassification: classification, payStatus: observed.payStatus, refundableAmount: observed.refundableAmount });
  const audit = async (message: string, diff: Record<string, unknown>) => appendAdminAudit(guard.db, { type: "apps_in_toss.reconciliation_recovery", actorId: guard.admin._id, targetId: intent._id, message, diff: { attemptId, originalFailureStage: intent.failureStage, originalFailureCode: intent.failureCode, observedPayStatus: observed.payStatus, observedClassification: classification, ...diff } }, req);
  const base = { ok: true as const, attemptId, previousState: intent.state, observed: { payStatus: observed.payStatus, classification, refundableAmount: observed.refundableAmount } };
  if (decision.kind === "wait") {
    await audit("Apps in Toss 결제 대사 복구 대기", { currentState: intent.state, outcome: "wait", reasonCode: decision.reasonCode });
    return NextResponse.json({ ...base, outcome: "wait", currentState: intent.state, message: decision.message } satisfies AppsInTossAdminRecoveryResponse);
  }
  if (decision.kind === "blocked") {
    await audit("Apps in Toss 결제 대사 자동 복구 차단", { currentState: intent.state, outcome: "blocked", reasonCode: decision.reasonCode });
    return NextResponse.json({ ...base, outcome: "blocked", currentState: intent.state, message: decision.message } satisfies AppsInTossAdminRecoveryResponse, { status: 409 });
  }
  const paidAt = decision.kind === "recover_paid" ? parseObservedPaidAt(observed.paidTs) : undefined;
  if (decision.kind === "recover_paid" && !paidAt) {
    await audit("Apps in Toss 결제 대사 자동 복구 차단", { currentState: intent.state, outcome: "blocked", reasonCode: "TOSS_PAYMENT_RECOVERY_EVIDENCE_INVALID" });
    return apiError(409, "TOSS_PAYMENT_RECOVERY_EVIDENCE_INVALID");
  }
  const recovered = await recoverAppsInTossPaymentReconciliation(guard.db, {
    id: intent._id, actorId: guard.admin._id, expectedFailureStage: intent.failureStage as "payment_status" | "refund_status",
    expectedFailureCode: intent.failureCode as "PAYMENT_STATUS_UNCONFIRMED" | "PAYMENT_REFUND_STATUS_UNCONFIRMED",
    observedPayStatus: observed.payStatus, observedClassification: classification as "payment_cancelled" | "payment_complete" | "payment_settled" | "refund_complete" | "refund_settled",
    targetState: decision.targetState, ...(paidAt ? { paidAt } : {}),
  });
  if (!recovered) {
    const latest = await findAppsInTossPaymentIntentByAttemptId(guard.db, attemptId);
    return apiError(409, "RECONCILIATION_RECOVERY_CONFLICT", latest ? `결제 상태가 이미 ${latest.state}(으)로 변경되었습니다.` : undefined);
  }
  let latest = recovered;
  if (decision.kind === "recover_paid") {
    try { await completeAppsInTossPayment({ db: guard.db, attemptId, userId: intent.userId, identityId: intent.identityId }); } catch { /* fresh paid evidence is never rolled back */ }
    latest = await findAppsInTossPaymentIntentByAttemptId(guard.db, attemptId) ?? recovered;
  }
  const allowed = ["paid", "finalized", "failed", "refunding", "refunded", "reconciliation_required"];
  if (!allowed.includes(latest.state)) return apiError(409, "RECONCILIATION_RECOVERY_STATE_UNEXPECTED");
  const outcome = latest.state === "paid" ? "followup_required" : "recovered";
  const message = outcome === "followup_required" ? "결제 상태는 복구되었지만 주문 확정 후속 처리가 필요합니다." : "최신 외부 거래 증거에 따라 내부 결제 상태를 안전하게 복구했습니다.";
  await audit("Apps in Toss 결제 대사 복구", { targetState: decision.targetState, currentState: latest.state, outcome });
  return NextResponse.json({ ...base, outcome, targetState: decision.targetState, currentState: latest.state, message, ...(latest.state === "finalized" && latest.finalOrderId ? { orderId: latest.finalOrderId.toHexString() } : {}) } satisfies AppsInTossAdminRecoveryResponse, { status: outcome === "followup_required" ? 202 : 200 });
}
