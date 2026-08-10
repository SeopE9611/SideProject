import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const route = read("../app/api/admin/apps-in-toss/reconciliation/[attemptId]/status-check/route.ts");
const classifier = read("../app/api/admin/apps-in-toss/_lib/status-check.ts");
const client = read("../app/admin/operations/apps-in-toss-reconciliation/_components/AppsInTossReconciliationClient.tsx");
const stateMachine = read("../lib/apps-in-toss/server/payment-intent-state.ts");

test("POST 관리자 경계와 최신 점검 대상 재검증을 적용한다", () => {
  assert.match(route, /export async function POST/);
  assert.match(route, /requireAdmin\(req\)[\s\S]*verifyAdminCsrf\(req\)/);
  assert.match(route, /assertAttemptId\(rawAttemptId\)/);
  assert.match(route, /findAppsInTossPaymentIntentByAttemptId\(guard\.db, attemptId\)/);
  assert.match(route, /classifyAppsInTossPaymentAttention\(intent, new Date\(\)\)/);
  assert.match(route, /if \(!attention\) return error\(409, "PAYMENT_RECONCILIATION_NOT_REQUIRED"\)/);
});

test("runtime과 저장 intent 환경 및 canonical 입력을 외부 호출 전에 검증한다", () => {
  assert.match(route, /getAppsInTossTossPayMode\(\)/);
  assert.match(route, /mode\.isTestPayment !== intent\.isTestPayment/);
  assert.match(route, /parseTossPayToken\(intent\.payToken\)/);
  assert.match(route, /assertTossPayOrderNo\(orderNo\)/);
  assert.match(route, /Number\.isInteger\(amount\)[\s\S]*amount <= 0[\s\S]*amount > 9_999_999/);
  assert.match(route, /loadActiveAppsInTossUserKey\(guard\.db, intent\.identityId, intent\.userId\)/);
  assert.match(route, /getTossPayPaymentStatus\(userKey, \{ payToken, orderNo \}\)/);
});

test("유일한 Toss 호출은 한 번의 get-payment-status이며 intent를 변경하지 않는다", () => {
  assert.equal((route.match(/getTossPayPaymentStatus\(userKey/g) ?? []).length, 1);
  for (const forbidden of ["executeTossPayPayment", "refundTossPayPayment", "makeTossPayPayment", "executeAppsInTossPayment", "finalizeAppsInTossPayment", "refundAppsInTossFinalizationFailure", "completeAppsInTossPayment", "updateOne", "findOneAndUpdate", "transition(", "recordAppsInTossPayment"]) assert.doesNotMatch(route, new RegExp(forbidden.replace("(", "\\(")));
  assert.match(stateMachine, /reconciliation_required: \[\]/);
});

test("SUCCESS 응답의 mode, payToken, orderNo, amount를 canonical 값과 교차검증한다", () => {
  assert.match(route, /observed\.payToken !== payToken/);
  assert.match(route, /observed\.orderNo !== orderNo/);
  assert.match(route, /observed\.amount !== amount/);
  assert.match(route, /observed\.mode !== expectedMode/);
  assert.match(route, /TOSS_PAYMENT_STATUS_CANONICAL_MISMATCH/);
});

test("observed classifier는 공식 상태를 9종 의미로만 분류한다", () => {
  assert.match(classifier, /\["PAY_STANDBY", "PAY_APPROVED", "PAY_PROGRESS"\][\s\S]*"payment_pending"/);
  for (const [status, classification] of [["PAY_CANCEL", "payment_cancelled"], ["PAY_COMPLETE", "payment_complete"], ["SETTLEMENT_COMPLETE", "payment_settled"], ["REFUND_PROGRESS", "refund_progress"]]) assert.match(classifier, new RegExp(`${status}[^\\n]*${classification}`));
  assert.match(classifier, /REFUND_SUCCESS[^\n]*refundableAmount === 0 \? "refund_complete" : "refund_inconsistent"/);
  assert.match(classifier, /SETTLEMENT_REFUND_COMPLETE[^\n]*refundableAmount === 0 \? "refund_settled" : "refund_inconsistent"/);
  assert.match(classifier, /return "unknown"/);
});

test("API와 audit은 안전한 관측 필드만 구성한다", () => {
  assert.match(route, /appendAdminAudit/);
  assert.match(route, /apps_in_toss\.payment_status_check/);
  assert.match(route, /external: \{ mode: observed\.mode, payStatus: observed\.payStatus, classification, amount: observed\.amount, paidAmount: observed\.paidAmount, refundableAmount: observed\.refundableAmount \}/);
  const response = route.slice(route.indexOf("const response:"), route.indexOf("await appendAdminAudit", route.indexOf("const response:")));
  for (const forbidden of ["payToken", "userKey", "identityId", "orderNo", "transactionId", "transactions", "refundNo", "approvalTime"]) assert.doesNotMatch(response, new RegExp(forbidden));
  assert.doesNotMatch(route, /diff: \{[^}]*?(payToken|userKey|identityId|orderNo|transactionId|transactions)/);
});

test("UI는 adminMutator 기반 수동 상태 확인만 제공한다", () => {
  assert.match(client, /adminMutator<AppsInTossAdminStatusCheckResponse>/);
  assert.match(client, /method: "POST"/);
  assert.match(client, /Toss 상태 확인/);
  assert.match(client, /checkingAttemptId/);
  assert.match(client, /확인 중\.\.\./);
  assert.match(client, /외부 상태:/);
  assert.doesNotMatch(client, /setInterval|setTimeout|refreshInterval/);
  for (const action of ["재시도", "상태 복구", "환불 실행", "결제 승인", "강제 완료"]) assert.doesNotMatch(client, new RegExp(`>${action}<`));
});
