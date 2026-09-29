import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const policy = read("../app/api/admin/apps-in-toss/_lib/recovery.ts");
const route = read("../app/api/admin/apps-in-toss/reconciliation/[attemptId]/recover/route.ts");
const intents = read("../lib/apps-in-toss/server/payment-intents.ts");
const client = read("../app/admin/operations/apps-in-toss-reconciliation/_components/AppsInTossReconciliationClient.tsx");

test("payment uncertainty matrix는 pending/cancel/complete/settled만 결정적으로 처리한다", () => {
  assert.match(policy, /payment_pending[^\n]*kind: "wait"/);
  assert.match(policy, /payment_cancelled[^\n]*kind: "recover_failed"/);
  assert.match(policy, /payment_complete" \|\| observedClassification === "payment_settled"[^\n]*kind: "recover_paid"/);
  assert.match(policy, /return blocked\("PAYMENT_RECOVERY_MATRIX_MISMATCH"\)/);
});

test("refund uncertainty matrix는 progress와 zero-refundable terminal만 처리한다", () => {
  assert.match(policy, /refund_progress[^\n]*kind: "wait"/);
  assert.match(policy, /refund_complete" \|\| observedClassification === "refund_settled"[^\n]*kind: "recover_refunded"/);
  assert.match(policy, /REFUND_INCONSISTENT/);
  assert.match(policy, /FINALIZATION_METADATA_INCONSISTENT/);
});

test("공통 prerequisite와 paidTs evidence를 검증한다", () => {
  for (const pattern of [/state !== "reconciliation_required"/, /intent\.finalOrderId/, /intent\.isTestPayment/, /UNKNOWN_RECONCILIATION_METADATA/, /parseObservedPaidAt/, /Number\.isNaN\(date\.getTime\(\)\)/]) assert.match(policy, pattern);
  assert.match(route, /TOSS_PAYMENT_RECOVERY_EVIDENCE_INVALID/);
  assert.doesNotMatch(route, /paidAt: new Date/);
});

test("전용 CAS는 metadata와 finalOrderId를 함께 비교하고 안전 evidence만 저장한다", () => {
  for (const pattern of [/state: "reconciliation_required"/, /failureStage: input\.expectedFailureStage/, /failureCode: input\.expectedFailureCode/, /finalOrderId: \{ \$exists: false \}/, /"finalization\.failureCode"/, /reconciliationRecovery: evidence/]) assert.match(intents, pattern);
  for (const forbidden of ["payToken", "userKey", "orderNo", "transactionId", "transactions", "refundNo", "approvalTime"]) {
    const evidence = intents.slice(intents.indexOf("const evidence ="), intents.indexOf("const set:", intents.indexOf("const evidence =")));
    assert.doesNotMatch(evidence, new RegExp(forbidden));
  }
  assert.match(intents, /"refund\.refundedAt"/);
  assert.doesNotMatch(intents, /unset\["refund\.(refundNo|approvalTime|transactionId)"\]/);
});

test("recover route는 body나 UI evidence 없이 fresh observation 후 CAS한다", () => {
  assert.match(route, /requireAdmin\(req\)[\s\S]*verifyAdminCsrf\(req\)[\s\S]*assertAttemptId\(rawAttemptId\)[\s\S]*findAppsInTossPaymentIntentByAttemptId/);
  assert.match(route, /observeAppsInTossPaymentStatus\(\{ db: guard\.db, intent \}\)/);
  assert.doesNotMatch(route, /req\.json|request\.json/);
  assert.equal((route.match(/completeAppsInTossPayment\(/g) ?? []).length, 1);
  for (const forbidden of ["executeAppsInTossPayment", "finalizeAppsInTossPayment", "refundAppsInTossFinalizationFailure", "refundTossPayPayment"]) assert.doesNotMatch(route, new RegExp(forbidden));
});

test("CAS loser와 completion failure는 reload하며 paid를 rollback하지 않는다", () => {
  assert.match(route, /if \(!recovered\)[\s\S]*findAppsInTossPaymentIntentByAttemptId/);
  assert.match(route, /catch \{ \/\* fresh paid evidence is never rolled back \*\/ \}[\s\S]*findAppsInTossPaymentIntentByAttemptId/);
  assert.match(route, /latest\.state === "paid" \? "followup_required"/);
  assert.doesNotMatch(route, /recordAppsInTossPaymentReconciliationRequired|state:\s*"reconciliation_required"/);
});

test("UI는 확인 dialog와 attempt별 상호 배타 ref lock을 사용한다", () => {
  assert.match(client, /AdminConfirmDialog/);
  assert.match(client, /recoveringAttemptIdsRef\.current\.has\(attemptId\)/);
  assert.match(client, /\/recover`, \{ method: "POST" \}/);
  assert.match(client, /recoveringAttemptIds\.has\(item\.attemptId\)/);
  assert.match(client, /disabled=\{isBusy\}/);
  assert.match(client, /await mutate\(\)/);
  assert.match(client, /delete next\[attemptId\]/);
  assert.doesNotMatch(client, /prompt\(|target state|강제 상태|환불 실행|결제 승인/);
});
