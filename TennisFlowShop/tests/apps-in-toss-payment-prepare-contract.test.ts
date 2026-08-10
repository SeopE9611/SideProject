import assert from "node:assert/strict";
import test from "node:test";

import {
  AppsPaymentPrepareRequestSchema,
  canonicalizeAppsPaymentPrepareRequest,
  createSafePaymentIntentResponse,
  isAppsPaymentIntentExpired,
  isPastVisitSlot,
  isSemanticCalendarDate,
  isSameAppsPaymentPayload,
  toSafeValidationDiagnostic,
} from "../lib/apps-in-toss/server/payment-prepare-contract";
import { buildAppsTossPayMakePaymentInput, normalizeAppsTossPayProductDescription } from "../lib/apps-in-toss/server/toss-pay-policy-contract";

const validRequest = {
  attemptId: "e68bd11d-f557-4a52-a20a-22f84cb28215",
  productId: "507f1f77bcf86cd799439011",
  selectedColor: "black",
  selectedGauge: "1.25",
  applicant: { name: "홍길동", email: "test@example.com", phone: "010 1234 5678" },
  collectionMethod: "self_ship" as const,
  shipping: { postalCode: "12345", address: "서울시", addressDetail: "101호" },
  work: { racketType: "테스트 라켓", tensionMain: "48", tensionCross: "46", note: "", preferredDate: "", preferredTime: "" },
};

test("payment prepare 요청을 정규화한다", () => {
  const parsed = AppsPaymentPrepareRequestSchema.parse(validRequest);
  assert.equal(parsed.selectedColor, "black");
});

test("잘못된 attemptId/productId와 courier_pickup을 거부한다", () => {
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...validRequest, attemptId: "bad" }).success, false);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...validRequest, productId: "bad" }).success, false);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...validRequest, collectionMethod: "courier_pickup" }).success, false);
});

test("self_ship 주소를 검증하고 visit 주소는 요구하지 않는다", () => {
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...validRequest, shipping: { postalCode: "", address: "", addressDetail: "" } }).success, false);
  const visit = { ...validRequest, collectionMethod: "visit", shipping: { postalCode: "", address: "", addressDetail: "" }, work: { ...validRequest.work, preferredDate: "2026-08-10", preferredTime: "10:00" } };
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse(visit).success, true);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...visit, work: { ...visit.work, preferredTime: "" } }).success, false);
});

test("대표 visit 결제 준비 요청 전체를 허용한다", () => {
  const visit = {
    attemptId: "ea075d77-e109-43d7-a7ec-9b97021b99b2",
    productId: "507f191e810c19729de860ea",
    selectedColor: "navy",
    selectedGauge: "1.25",
    applicant: { name: "테스트", email: "visit@example.com", phone: "01012345678" },
    collectionMethod: "visit",
    shipping: { postalCode: "", address: "", addressDetail: "" },
    work: { racketType: "테스트 라켓", tensionMain: "48", tensionCross: "46", note: "", preferredDate: "2026-08-09", preferredTime: "10:00" },
  };
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse(visit).success, true);
});

test("visit 날짜가 실제 Gregorian calendar에 존재하는지 검증한다", () => {
  assert.equal(isSemanticCalendarDate("2026-08-09"), true);
  assert.equal(isSemanticCalendarDate("2026-08-10"), true);
  assert.equal(isSemanticCalendarDate("2026-02-28"), true);
  assert.equal(isSemanticCalendarDate("2026-02-29"), false);
  assert.equal(isSemanticCalendarDate("2024-02-29"), true);
  assert.equal(isSemanticCalendarDate("2026-02-30"), false);
});

test("validation diagnostic은 path와 code만 포함하고 입력값을 제외한다", () => {
  const secretInput = "private@example.com";
  const parsed = AppsPaymentPrepareRequestSchema.safeParse({ ...validRequest, applicant: { ...validRequest.applicant, email: secretInput.repeat(20) } });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  const diagnostic = toSafeValidationDiagnostic(parsed.error.issues);
  assert.deepEqual(Object.keys(diagnostic[0] ?? {}).sort(), ["code", "path"]);
  assert.equal(diagnostic.some((issue) => issue.path === "applicant.email"), true);
  assert.equal(JSON.stringify(diagnostic).includes(secretInput), false);
});

test("Apps Toss Pay 과세 및 현금영수증 정책과 상품 설명을 구성한다", () => {
  const input = buildAppsTossPayMakePaymentInput({
    orderNo: "dkt-order_1",
    pricingSnapshot: { payableAmount: 10_000 },
    itemSnapshot: [{ name: ' 테스트 \\"상품 '.repeat(30) }],
  } as never);
  assert.equal(input.amountTaxFree, 0);
  assert.equal(input.cashReceipt, true);
  assert.equal(input.cashReceiptTradeOption, "GENERAL");
  assert.equal("amountTaxable" in input, false);
  assert.equal("amountVat" in input, false);
  assert.equal("installment" in input, false);
  assert.equal(input.productDesc.length <= 255, true);
  assert.equal(/[\\"]/.test(input.productDesc), false);
  assert.equal(normalizeAppsTossPayProductDescription("  ").trim().length > 0, true);
});

test("visit 주소는 비우고 self_ship 주소는 유지한다", () => {
  const visit = AppsPaymentPrepareRequestSchema.parse({
    ...validRequest,
    collectionMethod: "visit",
    shipping: { postalCode: "12345", address: "테스트 주소", addressDetail: "101호" },
    work: { ...validRequest.work, preferredDate: "2026-08-10", preferredTime: "10:00" },
  });
  assert.deepEqual(canonicalizeAppsPaymentPrepareRequest(visit).shipping, { postalCode: "", address: "", addressDetail: "" });
  const selfShip = AppsPaymentPrepareRequestSchema.parse(validRequest);
  assert.deepEqual(canonicalizeAppsPaymentPrepareRequest(selfShip).shipping, selfShip.shipping);
});

test("visit payload 비교에서 잔존 주소를 결제 의미에서 제외한다", () => {
  const first = canonicalizeAppsPaymentPrepareRequest(AppsPaymentPrepareRequestSchema.parse({
    ...validRequest,
    collectionMethod: "visit",
    work: { ...validRequest.work, preferredDate: "2026-08-10", preferredTime: "10:00" },
  }));
  const retried = canonicalizeAppsPaymentPrepareRequest({ ...first, shipping: { postalCode: "54321", address: "다른 테스트 주소", addressDetail: "202호" } });
  const checkout = { items: [{ productId: first.productId, selectedColor: first.selectedColor, selectedGauge: first.selectedGauge }], applicant: first.applicant, collectionMethod: first.collectionMethod, shipping: { postalCode: "12345", address: "잔존 테스트 주소", addressDetail: "101호" }, work: first.work };
  assert.equal(isSameAppsPaymentPayload(checkout, retried), true);
});

test("Asia/Seoul 방문 시각이 지났는지 주입한 현재 시각으로 판정한다", () => {
  const now = new Date("2026-08-09T03:00:00.000Z"); // Asia/Seoul 2026-08-09 12:00
  assert.equal(isPastVisitSlot("2026-08-10", "10:00", now), false);
  assert.equal(isPastVisitSlot("2026-08-09", "11:59", now), true);
  assert.equal(isPastVisitSlot("2026-08-09", "12:01", now), false);
});

test("safe response에는 결제 토큰, 사용자 키, 개인정보가 없다", () => {
  const response = createSafePaymentIntentResponse(paymentIntent("creating", new Date("2026-08-09T03:30:00.000Z")), new Date("2026-08-09T03:00:00.000Z"));
  assert.deepEqual(Object.keys(response), ["success", "attemptId", "state", "paymentReady", "expired", "paymentSummary"]);
  assert.equal(response.paymentReady, false);
  assert.equal(response.expired, false);
  assert.equal(JSON.stringify(response).includes("payToken"), false);
  assert.equal(JSON.stringify(response).includes("userKey"), false);
  assert.equal(JSON.stringify(response).includes(validRequest.applicant.email), false);
});

function paymentIntent(state: string, expiresAt: Date) {
  return { attemptId: validRequest.attemptId, state, expiresAt,
    itemSnapshot: [{ name: "테스트 스트링", quantity: 1 }],
    pricingSnapshot: { subtotal: 20_000, shippingFee: 3_000, serviceFeeBeforePackage: 5_000, serviceFee: 2_000, payableAmount: 25_000 },
    packageSnapshot: { applied: true } };
}

test("intent 만료와 paymentReady를 expiresAt까지 포함해 판정한다", () => {
  const now = new Date("2026-08-09T03:00:00.000Z");
  const future = new Date("2026-08-09T03:30:00.000Z");
  const expired = new Date("2026-08-09T03:00:00.000Z");
  assert.equal(isAppsPaymentIntentExpired(future, now), false);
  assert.equal(isAppsPaymentIntentExpired(expired, now), true);
  assert.equal(createSafePaymentIntentResponse(paymentIntent("awaiting_authorization", future), now).paymentReady, true);
  const expiredResponse = createSafePaymentIntentResponse(paymentIntent("awaiting_authorization", expired), now);
  assert.equal(expiredResponse.expired, true);
  assert.equal(expiredResponse.paymentReady, false);
  assert.equal(createSafePaymentIntentResponse(paymentIntent("creating", future), now).paymentReady, false);
});

test("같은 payload와 mismatch를 판정한다", () => {
  const parsed = AppsPaymentPrepareRequestSchema.parse(validRequest);
  const checkout = { items: [{ productId: parsed.productId, selectedColor: parsed.selectedColor, selectedGauge: parsed.selectedGauge }], applicant: parsed.applicant, collectionMethod: parsed.collectionMethod, shipping: parsed.shipping, work: parsed.work };
  assert.equal(isSameAppsPaymentPayload(checkout, parsed), true);
  assert.equal(isSameAppsPaymentPayload({ ...checkout, work: { ...checkout.work, note: "변경" } }, parsed), false);
});
