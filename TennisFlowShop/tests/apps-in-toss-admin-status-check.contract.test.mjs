import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const route = read("../app/api/admin/apps-in-toss/reconciliation/[attemptId]/status-check/route.ts");
const observation = read("../app/api/admin/apps-in-toss/_lib/status-observation.ts");
const client = read("../app/admin/operations/apps-in-toss-reconciliation/_components/AppsInTossReconciliationClient.tsx");
const stateMachine = read("../lib/apps-in-toss/server/payment-intent-state.ts");

test("status-check는 관리자 경계 뒤 최신 intent와 공용 observation을 사용한다", () => {
  assert.match(route, /requireAdmin\(req\)[\s\S]*verifyAdminCsrf\(req\)[\s\S]*assertAttemptId\(rawAttemptId\)[\s\S]*findAppsInTossPaymentIntentByAttemptId/);
  assert.match(route, /observeAppsInTossPaymentStatus\(\{ db: guard\.db, intent \}\)/);
  assert.doesNotMatch(route, /getTossPayPaymentStatus|findOneAndUpdate|updateOne|completeAppsInTossPayment/);
});

test("공용 observation은 canonical 검증과 단일 상태 조회만 수행한다", () => {
  for (const pattern of [/getAppsInTossTossPayMode\(\)/, /parseTossPayToken\(intent\.payToken\)/, /assertTossPayOrderNo\(intent\.orderNo\)/, /loadActiveAppsInTossUserKey\(db, intent\.identityId, intent\.userId\)/, /observed\.payToken !== payToken/, /observed\.orderNo !== intent\.orderNo/, /observed\.amount !== intent\.pricingSnapshot\.payableAmount/, /observed\.mode !== expectedMode/]) assert.match(observation, pattern);
  assert.equal((observation.match(/getTossPayPaymentStatus\(/g) ?? []).length, 1);
  for (const forbidden of ["executeTossPayPayment", "refundTossPayPayment", "makeTossPayPayment", "findOneAndUpdate", "updateOne"]) assert.doesNotMatch(observation, new RegExp(forbidden));
});

test("status-check는 read-only advisory이며 state machine은 복구 terminal만 허용한다", () => {
  assert.match(route, /classifyAppsInTossReconciliationRecovery/);
  assert.match(route, /eligibility: "eligible"/);
  assert.match(stateMachine, /reconciliation_required: \["paid", "failed", "refunded"\]/);
  assert.doesNotMatch(stateMachine, /reconciliation_required: \[[^\]]*(executing|awaiting_authorization|refunding|finalized|cancelled|creating)/);
});

test("UI의 행별 status lock과 안전 복구 advisory 표시를 유지한다", () => {
  assert.match(client, /checkingAttemptIdsRef\.current\.has\(attemptId\) \|\| recoveringAttemptIdsRef\.current\.has\(attemptId\)/);
  assert.match(client, /statusCheck\?\.recovery\.eligibility === "eligible"\s*&&\s*item\.issueType === "reconciliation_required"/);
  assert.match(client, /Toss 상태 확인/);
  assert.match(route, /observeAppsInTossPaymentStatus/);
  assert.doesNotMatch(client, /executeTossPayPayment|refundTossPayPayment/);
  assert.doesNotMatch(client, /setInterval|refreshInterval|targetState|forceState/);
});
