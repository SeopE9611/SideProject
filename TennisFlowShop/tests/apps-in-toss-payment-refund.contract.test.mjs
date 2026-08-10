import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync(new URL("../lib/apps-in-toss/server/payment-refund.ts", import.meta.url), "utf8");
const intents = readFileSync(new URL("../lib/apps-in-toss/server/payment-intents.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/apps-in-toss/payments/[attemptId]/refund-finalization/route.ts", import.meta.url), "utf8");
const finalization = readFileSync(new URL("../lib/apps-in-toss/server/payment-finalization.ts", import.meta.url), "utf8");
const execution = readFileSync(new URL("../lib/apps-in-toss/server/payment-execution.ts", import.meta.url), "utf8");
const config = readFileSync(new URL("../lib/apps-in-toss/server/config.ts", import.meta.url), "utf8");

test("finalization business failure가 있는 paid intent만 보상 환불 대상으로 삼는다", () => {
  assert.match(service, /state !== "paid" && intent\.state !== "refunding"/);
  assert.match(service, /!intent\.finalization\?\.failureCode.*PAYMENT_REFUND_NOT_ELIGIBLE/);
  assert.match(service, /intent\.state === "finalized" \|\| intent\.finalOrderId.*PAYMENT_REFUND_NOT_ELIGIBLE/);
  assert.match(service, /intent\.isTestPayment.*TEST_PAYMENT_REFUND_FORBIDDEN/);
  assert.match(service, /intent\.userId\.equals\(userId\) && intent\.identityId\.equals\(identityId\)/);
});

test("live runtime 확인이 DB 조회와 상태 변경보다 먼저 수행되고 별도 refund flag는 없다", () => {
  const orchestration = service.slice(service.indexOf("export async function refundAppsInTossFinalizationFailure"));
  assert.ok(orchestration.indexOf('getAppsInTossTossPayMode().mode !== "live"') < orchestration.indexOf("findAppsInTossPaymentIntentByAttemptId"));
  assert.doesNotMatch(service + config, /LIVE_REFUND_ENABLED|REFUND_FEATURE/);
});

test("canonical 결제 정보와 active identity의 userKey 및 서버 생성 사유만 사용한다", () => {
  assert.match(service, /parseTossPayToken\(intent\.payToken\)/);
  assert.match(service, /assertTossPayOrderNo\(intent\.orderNo\)/);
  assert.match(service, /intent\.pricingSnapshot\.payableAmount/);
  assert.match(service, /loadActiveAppsInTossUserKey\(params\.db, intent\.identityId, intent\.userId\)/);
  assert.match(service, /`주문확정실패:\$\{safeCode\}`\.slice\(0, 55\)/);
  assert.doesNotMatch(route, /request\.json|payToken|userKey|orderNo|reason|failureCode/);
});

test("paid에서 refunding으로 CAS claim하고 45초 단일 lease를 기록한다", () => {
  assert.match(service, /APPS_IN_TOSS_PAYMENT_REFUND_LEASE_MS = 45_000/);
  assert.match(service, /claimAppsInTossPaymentRefund\(params\.db, intent\._id, new Date\(Date\.now\(\) \+ APPS_IN_TOSS_PAYMENT_REFUND_LEASE_MS\)\)/);
  assert.match(intents, /transition\(db, id, "paid", "refunding", \{ refund: \{ claimedAt: now, leaseUntil, updatedAt: now \} \}\)/);
});

test("active lease는 외부 호출 없이 진행 중이며 expired lease는 status만 대사한다", () => {
  const orchestration = service.slice(service.indexOf("export async function refundAppsInTossFinalizationFailure"));
  const existing = orchestration.slice(orchestration.indexOf('if (intent.state === "refunding")'), orchestration.indexOf("const reason ="));
  assert.match(existing, /leaseUntil > new Date\(\).*PAYMENT_REFUND_IN_PROGRESS/s);
  assert.match(existing, /return reconcile/);
  assert.doesNotMatch(existing, /refundTossPayPayment/);
});

test("refund-payment는 claim 뒤 한 번만 호출하고 모든 불확실 결과는 status 대사로 이동한다", () => {
  assert.equal((service.match(/await refundTossPayPayment\(/g) ?? []).length, 1);
  assert.match(service, /요청 도달 여부가 불확실해도 refund-payment를 절대 재호출하지 않는다/);
  assert.match(service, /return reconcile\(params\.db, claimed, userKey, canonical, "refund_payment"\)/);
});

test("직접 SUCCESS는 canonical full refund와 금액 합계를 모두 검증한다", () => {
  assert.match(service, /value\.payToken === canonical\.payToken/);
  assert.match(service, /value\.refundedAmount === canonical\.amount/);
  assert.match(service, /value\.refundableAmount === 0/);
  assert.match(service, /value\.refundedPaidAmount \+ value\.refundedDiscountAmount === value\.refundedAmount/);
});

test("status는 canonical LIVE 결제만 환불 성공 또는 진행 중으로 반영한다", () => {
  assert.match(service, /matchesCanonicalLivePayment\(result, canonical\)/);
  assert.match(service, /status === "REFUND_SUCCESS" \|\| status === "SETTLEMENT_REFUND_COMPLETE"/);
  assert.match(service, /refundableAmount === 0/);
  assert.match(service, /status === "REFUND_PROGRESS"/);
  assert.match(service, /renewAppsInTossPaymentRefundLease/);
  assert.doesNotMatch(service, /status === "PAY_COMPLETE"|status === "SETTLEMENT_COMPLETE"/);
  assert.match(service, /PAYMENT_REFUND_STATUS_UNCONFIRMED/);
});

test("refunded는 멱등 응답하고 API는 안전한 최소 필드만 반환한다", () => {
  assert.match(service, /intent\.state === "refunded"\) return safeResponse\(intent\)/);
  assert.match(service, /return \{ success: true, attemptId: intent\.attemptId, state: intent\.state \}/);
  assert.doesNotMatch(route, /refundNo|transactionId|raw Toss/);
});

test("evidence만 저장하고 lease를 제거하며 raw 또는 금융정보를 저장하지 않는다", () => {
  assert.match(intents, /refundedAt\?: Date; refundNo\?: string; approvalTime\?: string; transactionId\?: string/);
  assert.match(intents, /\{ "refund\.leaseUntil": "" \}/);
  assert.doesNotMatch(intents, /cardNumber|accountNumber|cardBinNumber|rawTossResponse/);
});

test("finalize와 execute 흐름에는 자동 보상 환불을 연결하지 않는다", () => {
  assert.doesNotMatch(finalization + execution, /refundAppsInTossFinalizationFailure/);
});
