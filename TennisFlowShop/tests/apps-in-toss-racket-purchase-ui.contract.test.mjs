import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("pending 결제 복구는 라켓 구매 view보다 먼저 평가된다", () => {
  const app = read("TossMiniApp/src/App.tsx");
  assert.ok(app.indexOf("if (pendingPayment)") < app.indexOf("if (isRacketPurchase"));
  assert.match(app, /view", "racket-purchase"/);
  assert.match(app, /searchParams\.set\("racketId", racketId\)/);
  assert.match(app, /searchParams\.set\("step", "1"\)/);
});

test("라켓 구매 prepare는 서버 계산 필드 없이 수량과 옵션만 전송한다", () => {
  const payments = read("TossMiniApp/src/api/payments.ts");
  const start = payments.indexOf("export function prepareRacketPurchasePayment");
  const end = payments.indexOf("export function getAppsPaymentIntent", start);
  const request = payments.slice(start, end);
  assert.match(request, /purpose: "racket_purchase"/);
  assert.match(request, /selectedColor/);
  assert.match(request, /selectedGauge/);
  assert.match(request, /quantity/);
  for (const forbidden of ["racketPrice", "stringPrice", "mountingFee", "shippingFee", "serviceFee", "totalPrice", "packageDiscount", "stock", "available"]) {
    assert.equal(request.includes(forbidden), false, `${forbidden} must not be sent`);
  }
});

test("checkout SDK와 pending marker 계약은 기존 형태를 유지한다", () => {
  const checkout = read("TossMiniApp/src/components/AppsPaymentCheckoutPanel.tsx");
  const pending = read("TossMiniApp/src/lib/pending-payment.ts");
  assert.match(checkout, /checkoutPayment\(\{ params: \{ payToken \} \}\)/);
  assert.match(pending, /type PendingAppsPayment = \{ attemptId: string; authorizedAt: string \}/);
  assert.match(pending, /Object\.keys\(value\)\.sort\(\)\.join\(","\) !== "attemptId,authorizedAt"/);
});

test("라켓 구매 draft의 개인정보는 URL이나 storage에 기록하지 않는다", () => {
  const flow = read("TossMiniApp/src/components/RacketPurchaseFlow.tsx");
  const app = read("TossMiniApp/src/App.tsx");
  for (const source of [flow, app]) {
    assert.doesNotMatch(source, /searchParams\.set\("(?:applicant|name|email|phone|postalCode|address|note)"/);
  }
  assert.doesNotMatch(flow, /localStorage|sessionStorage/);
});

test("라켓 구매는 스트링·장착서비스 필수이며 대여 결제를 추가하지 않는다", () => {
  const stepOne = read("TossMiniApp/src/components/RacketPurchaseStepOne.tsx");
  const payment = read("TossMiniApp/src/api/payments.ts");
  assert.match(stepOne, /라켓 수량과 같은 수량의 스트링 및 장착서비스가 함께 주문됩니다/);
  assert.match(payment, /stringProductId/);
  assert.doesNotMatch(payment, /racket_rental|rental_purchase/);
});

test("activity 응답은 기존 필드를 유지하며 라켓 구매 정보를 확장한다", () => {
  const route = read("TennisFlowShop/app/api/apps-in-toss/me/activity/route.ts");
  for (const field of ["productName", "color", "gauge", "collectionMethod", "status", "paymentStatus", "amount", "racketType"]) {
    assert.match(route, new RegExp(`${field}:`));
  }
  assert.match(route, /activityType: isRacketPurchase \? "racket_purchase" : "stringing_service"/);
  assert.match(route, /stringName:/);
  assert.match(route, /quantity:/);
  assert.match(route, /item\?\.kind === "racket"/);
});

test("수량·옵션·navigation과 새로고침 guard를 고정한다", () => {
  const flow = read("TossMiniApp/src/components/RacketPurchaseFlow.tsx");
  const stepOne = read("TossMiniApp/src/components/RacketPurchaseStepOne.tsx");
  const options = read("TossMiniApp/src/hooks/useProductDetailOptions.ts");
  assert.match(stepOne, /Math\.min\(availability\.available, 10\)/);
  assert.match(options, /requiredQuantity/);
  assert.match(options, /row\.stock < requiredStock/);
  assert.match(flow, /window\.addEventListener\("popstate", handlePopState\)/);
  assert.match(flow, /getStepFromLocation\(\) === 1/);
  assert.match(flow, /window\.history\.replaceState\(\{ view: "racket-purchase", racketId, step: 1 \}/);
  assert.match(flow, /setPaymentAttemptId\(null\)/);
  assert.match(flow, /if \(pending\)[\s\S]*setPendingPayment\(pending\)[\s\S]*return false/);
});

test("결제 오류는 재고·옵션·방문예약·pending 복구 경로를 구분한다", () => {
  const panel = read("TossMiniApp/src/components/AppsPaymentCheckoutPanel.tsx");
  const flow = read("TossMiniApp/src/components/RacketPurchaseFlow.tsx");
  for (const code of [
    "RACKET_NOT_AVAILABLE", "RACKET_UNAVAILABLE", "RACKET_RENTAL_RESERVED", "RACKET_INSUFFICIENT_STOCK",
    "PRODUCT_NOT_AVAILABLE", "VARIANT_NOT_FOUND", "VARIANT_SOLD_OUT", "VARIANT_INSUFFICIENT_STOCK",
    "VISIT_SLOT_UNAVAILABLE", "PACKAGE_PASS_UNAVAILABLE", "ATTEMPT_PAYLOAD_MISMATCH", "PAYMENT_INTENT_EXPIRED",
    "PAYMENT_CREATION_IN_PROGRESS", "PAYMENT_EXECUTION_IN_PROGRESS", "PAYMENT_FINALIZATION_SNAPSHOT_INVALID",
    "PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX", "reconciliation_required", "refunded",
  ]) assert.match(panel, new RegExp(code));
  assert.match(flow, /const pending = readPendingAppsPayment\(\);[\s\S]*if \(pending\)[\s\S]*setPendingPayment\(pending\)/);
  assert.match(flow, /routeWithError\(1/);
  assert.match(flow, /routeWithError\(4/);
});
