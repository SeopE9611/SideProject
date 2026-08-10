import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { getAppsInTossTossPayMode } from "@/lib/apps-in-toss/server/config";
import { loadActiveAppsInTossUserKey } from "@/lib/apps-in-toss/server/identity";
import { findAppsInTossPaymentIntentByAttemptId } from "@/lib/apps-in-toss/server/payment-intents";
import { getTossPayPaymentStatus } from "@/lib/apps-in-toss/server/toss-pay-client";
import { assertAttemptId, assertTossPayOrderNo, parseTossPayToken } from "@/lib/apps-in-toss/server/toss-pay-contract";
import type { AppsInTossAdminStatusCheckResponse } from "@/types/admin/apps-in-toss-reconciliation";
import { classifyAppsInTossPaymentAttention } from "../../../_lib/reconciliation";
import { classifyAppsInTossObservedPaymentStatus, type AppsInTossObservedPaymentStatusClassification } from "../../../_lib/status-check";

const GUIDANCE: Record<AppsInTossObservedPaymentStatusClassification, string> = {
  payment_pending: "외부 결제가 아직 완료되지 않았습니다. 재승인을 직접 실행하지 마세요.",
  payment_cancelled: "외부 결제 취소 상태가 확인되었습니다.",
  payment_complete: "외부 결제 완료 상태가 확인되었습니다. 내부 상태 복구 여부를 다음 단계에서 판단합니다.",
  payment_settled: "외부 결제 및 정산 완료 상태가 확인되었습니다. 내부 상태 복구 여부를 다음 단계에서 판단합니다.",
  refund_progress: "외부 환불이 진행 중입니다. refund-payment를 다시 호출하지 마세요.",
  refund_complete: "외부 환불 완료 상태가 확인되었습니다.",
  refund_settled: "외부 환불 및 환불 정산 완료 상태가 확인되었습니다.",
  refund_inconsistent: "환불 상태와 환불 가능 잔액이 일치하지 않습니다. 자동 복구하지 마세요.",
  unknown: "자동으로 해석할 수 없는 외부 상태입니다. 자동 복구하지 마세요.",
};

function error(status: number, code: string) {
  return NextResponse.json({ ok: false, code, message: "결제 외부 상태를 확인할 수 없습니다." }, { status });
}

export async function POST(req: Request, context: { params: Promise<{ attemptId: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { attemptId: rawAttemptId } = await context.params;
  let attemptId: string;
  try {
    assertAttemptId(rawAttemptId);
    attemptId = rawAttemptId;
  } catch {
    return error(400, "INVALID_ATTEMPT_ID");
  }

  const intent = await findAppsInTossPaymentIntentByAttemptId(guard.db, attemptId);
  if (!intent) return error(404, "PAYMENT_INTENT_NOT_FOUND");
  const attention = classifyAppsInTossPaymentAttention(intent, new Date());
  if (!attention) return error(409, "PAYMENT_RECONCILIATION_NOT_REQUIRED");

  const mode = getAppsInTossTossPayMode();
  if (mode.isTestPayment !== intent.isTestPayment) return error(409, "PAYMENT_STATUS_CHECK_ENVIRONMENT_MISMATCH");

  let payToken: string;
  const orderNo = intent.orderNo;
  const amount = intent.pricingSnapshot.payableAmount;
  try {
    payToken = parseTossPayToken(intent.payToken);
    assertTossPayOrderNo(orderNo);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 9_999_999) throw new Error("invalid amount");
  } catch {
    return error(409, "PAYMENT_STATUS_CHECK_UNAVAILABLE");
  }

  let userKey: string;
  try {
    userKey = await loadActiveAppsInTossUserKey(guard.db, intent.identityId, intent.userId);
  } catch {
    return error(409, "PAYMENT_STATUS_CHECK_UNAVAILABLE");
  }
  let result: Awaited<ReturnType<typeof getTossPayPaymentStatus>>;
  try {
    result = await getTossPayPaymentStatus(userKey, { payToken, orderNo });
  } catch {
    await appendAdminAudit(guard.db, {
      type: "apps_in_toss.payment_status_check", actorId: guard.admin._id, targetId: intent._id,
      message: "Apps in Toss 결제 외부 상태 확인 실패",
      diff: { attemptId, issueType: attention.issueType, internalState: intent.state, failureCode: "TOSS_PAYMENT_STATUS_CHECK_FAILED" },
    }, req);
    return error(502, "TOSS_PAYMENT_STATUS_CHECK_FAILED");
  }

  if (result.kind === "toss_failure") {
    await appendAdminAudit(guard.db, {
      type: "apps_in_toss.payment_status_check", actorId: guard.admin._id, targetId: intent._id,
      message: "Apps in Toss 결제 외부 상태 확인 실패",
      diff: { attemptId, issueType: attention.issueType, internalState: intent.state, failureCode: "TOSS_PAYMENT_STATUS_CHECK_FAILED" },
    }, req);
    return error(502, "TOSS_PAYMENT_STATUS_CHECK_FAILED");
  }

  const observed = result.value.success;
  const expectedMode = intent.isTestPayment ? "TEST" : "LIVE";
  if (observed.payToken !== payToken || observed.orderNo !== orderNo || observed.amount !== amount || observed.mode !== expectedMode) {
    await appendAdminAudit(guard.db, {
      type: "apps_in_toss.payment_status_check", actorId: guard.admin._id, targetId: intent._id,
      message: "Apps in Toss 결제 외부 상태 확인 실패",
      diff: { attemptId, issueType: attention.issueType, internalState: intent.state, failureCode: "TOSS_PAYMENT_STATUS_CANONICAL_MISMATCH" },
    }, req);
    return error(409, "TOSS_PAYMENT_STATUS_CANONICAL_MISMATCH");
  }

  const classification = classifyAppsInTossObservedPaymentStatus(observed);
  const checkedAt = new Date().toISOString();
  const response: AppsInTossAdminStatusCheckResponse = {
    ok: true, attemptId, issueType: attention.issueType, internalState: intent.state, checkedAt,
    external: { mode: observed.mode, payStatus: observed.payStatus, classification, amount: observed.amount, paidAmount: observed.paidAmount, refundableAmount: observed.refundableAmount },
    guidance: GUIDANCE[classification],
  };
  await appendAdminAudit(guard.db, {
    type: "apps_in_toss.payment_status_check", actorId: guard.admin._id, targetId: intent._id,
    message: "Apps in Toss 결제 외부 상태 확인",
    diff: { attemptId, issueType: attention.issueType, internalState: intent.state, expectedEnvironment: expectedMode, observedMode: observed.mode, observedPayStatus: observed.payStatus, classification, amount: observed.amount, refundableAmount: observed.refundableAmount },
  }, req);
  return NextResponse.json(response);
}
