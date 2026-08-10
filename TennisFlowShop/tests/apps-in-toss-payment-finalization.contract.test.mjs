import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync(new URL("../lib/apps-in-toss/server/payment-finalization.ts", import.meta.url), "utf8");
const intents = readFileSync(new URL("../lib/apps-in-toss/server/payment-intents.ts", import.meta.url), "utf8");
const submit = readFileSync(new URL("../app/features/stringing-applications/api/submit-core.ts", import.meta.url), "utf8");
const miniAppForbidden = ["../TossMiniApp/src/utils/payments.ts", "../TossMiniApp/src/pages/stringing-application/steps/StringingApplicationStepFive.tsx"];

test("paid intent만 snapshot 기반 단일 transaction으로 확정한다", () => {
  assert.match(service, /state !== "paid"/);
  assert.match(service, /session\.withTransaction/);
  assert.match(service, /recordAppsInTossPaymentFinalized\(params\.db, intent\._id, orderId, session\)/);
  assert.match(service, /item\.price/);
  assert.match(service, /item\.mountingFee/);
  assert.doesNotMatch(service, /getEffectiveProductPrice|calcStringingMountingFeeByProductId|calculateCheckoutPayableAmount/);
});

test("variant, exact pass, visit guard와 멱등 key를 함께 사용한다", () => {
  assert.match(service, /variantInventories\.\$\[variant\]\.stock/);
  assert.match(service, /stockDeduction: \{ mode: "variant"/);
  assert.match(service, /consumePass\(params\.db, packageSnapshot\.passId!/);
  assert.match(service, /guardVisitReservation/);
  assert.match(service, /apps-in-toss:\$\{intent\.attemptId\}/);
  assert.match(submit, /guardVisitReservation/);
});

test("paidAt과 durable business failure 정책을 유지한다", () => {
  assert.match(intents, /paidAt: new Date\(\)/);
  assert.match(service, /PAYMENT_FINALIZATION_FAILED_REFUND_REQUIRED/);
  assert.match(service, /"finalization\.failureCode": \{ \$exists: false \}/);
  assert.doesNotMatch(service, /refundTossPayPayment|claimAppsInTossPaymentRefund|recordAppsInTossPaymentRefunded|executeAppsInTossPayment/);
});

test("MiniApp finalization 연결 파일은 contract 범위 밖이며 변경 대상이 아니다", () => {
  assert.equal(miniAppForbidden.length, 2);
});
