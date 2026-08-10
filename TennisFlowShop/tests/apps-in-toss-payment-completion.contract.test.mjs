import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync(new URL("../lib/apps-in-toss/server/payment-completion.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/apps-in-toss/payments/[attemptId]/complete/route.ts", import.meta.url), "utf8");
const miniAppPayments = readFileSync(new URL("../../TossMiniApp/src/api/payments.ts", import.meta.url), "utf8");

test("completion action은 기존 state와 durable finalization failure만 분류한다", () => {
  const classifier = service.slice(service.indexOf("export function classifyAppsPaymentCompletionAction"), service.indexOf("function owns"));
  assert.match(classifier, /state === "creating".*"unavailable"/s);
  assert.match(classifier, /state === "awaiting_authorization" \|\| intent\.state === "executing".*"execute"/s);
  assert.match(classifier, /state === "paid".*finalization\?\.failureCode \? "refund" : "finalize"/s);
  assert.match(classifier, /state === "refunding".*"refund"/s);
  for (const state of ["finalized", "refunded", "failed", "cancelled", "reconciliation_required"]) assert.doesNotMatch(classifier, new RegExp(`state === "${state}"`));
  assert.match(classifier, /return "return"/);
});

test("execute는 한 번만 호출되고 이후 persisted intent를 reload해 다음 action을 정한다", () => {
  const completion = service.slice(service.indexOf("export async function completeAppsInTossPayment"));
  assert.equal(completion.match(/executeAppsInTossPayment\(params\)/g)?.length, 1);
  assert.match(completion, /await executeAppsInTossPayment\(params\);[\s\S]*intent = await reloadOwned\(params\);[\s\S]*classifyAppsPaymentCompletionAction\(intent\)/);
  assert.match(completion, /PAYMENT_EXECUTION_IN_PROGRESS[\s\S]*reloadOwned\(params\)[\s\S]*intent\.state !== "executing"[\s\S]*safeResponse\(intent\)/);
});

test("finalization exception 뒤 persisted failure와 finalOrderId를 확인한 경우에만 refund한다", () => {
  const finalization = service.slice(service.indexOf("try {\n    return await finalizeAppsInTossPayment"));
  assert.match(finalization, /AppsPaymentFinalizationError[\s\S]*intent = await reloadOwned\(params\)/);
  assert.match(finalization, /intent\.state === "finalized"[\s\S]*finalizeAppsInTossPayment\(params\)/);
  assert.match(finalization, /intent\.state === "paid" && intent\.finalization\?\.failureCode && !intent\.finalOrderId/);
  assert.match(finalization, /return refundAndReload\(params\)/);
  assert.match(finalization, /throw error/);
  assert.doesNotMatch(finalization, /error\.business/);
});

test("refund orchestration은 기존 service를 한 번만 호출하고 in-progress와 결과를 reload한다", () => {
  const helper = service.slice(service.indexOf("async function refundAndReload"), service.indexOf("export async function completeAppsInTossPayment"));
  assert.equal(helper.match(/refundAppsInTossFinalizationFailure\(params\)/g)?.length, 1);
  assert.match(helper, /eligible\.state === "finalized" \|\| eligible\.finalOrderId[\s\S]*PAYMENT_REFUND_NOT_ELIGIBLE/);
  assert.match(helper, /PAYMENT_REFUND_IN_PROGRESS[\s\S]*reloadOwned\(params\)[\s\S]*current\.state !== "refunding"/);
  assert.match(helper, /safeResponse\(await reloadOwned\(params\)\)/);
});

test("terminal state는 side effect 없이 반환하고 finalized만 기존 safe read를 재사용한다", () => {
  assert.match(service, /action === "return"[\s\S]*intent\.state === "finalized" \? finalizeAppsInTossPayment\(params\) : safeResponse\(intent\)/);
  assert.match(service, /action === "refund"\) return refundAndReload\(params\)/);
  assert.match(service, /action === "unavailable"[\s\S]*PAYMENT_STATE_UNAVAILABLE/);
});

test("complete route는 인증, CORS, validation, no-store 및 safe error 계약을 유지한다", () => {
  assert.match(route, /authenticateAppsSession/);
  assert.match(route, /isAppsInTossAllowedOrigin/);
  assert.match(route, /assertAttemptId/);
  assert.match(route, /Cache-Control", "no-store"/);
  assert.match(route, /PAYMENT_COMPLETION_FAILED/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.doesNotMatch(route, /payToken|userKey|orderNo|refundNo|transactionId|failureCode/);
});

test("completion은 Toss client나 finalization transaction을 복제하지 않고 MiniApp을 연결하지 않는다", () => {
  assert.doesNotMatch(service, /toss-pay-client|executeTossPayPayment|refundTossPayPayment|withTransaction|consumePass|guardVisitReservation/);
  assert.doesNotMatch(miniAppPayments, /\/complete/);
});
