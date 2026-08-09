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

test("visit 날짜가 실제 Gregorian calendar에 존재하는지 검증한다", () => {
  assert.equal(isSemanticCalendarDate("2026-02-28"), true);
  assert.equal(isSemanticCalendarDate("2026-02-29"), false);
  assert.equal(isSemanticCalendarDate("2024-02-29"), true);
  assert.equal(isSemanticCalendarDate("2026-02-30"), false);
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
  const response = createSafePaymentIntentResponse(validRequest.attemptId, "creating", new Date("2026-08-09T03:30:00.000Z"), new Date("2026-08-09T03:00:00.000Z"));
  assert.deepEqual(Object.keys(response), ["success", "attemptId", "state", "paymentReady", "expired"]);
  assert.equal(response.paymentReady, false);
  assert.equal(response.expired, false);
  assert.equal(JSON.stringify(response).includes("payToken"), false);
  assert.equal(JSON.stringify(response).includes("userKey"), false);
  assert.equal(JSON.stringify(response).includes(validRequest.applicant.email), false);
});

test("intent 만료와 paymentReady를 expiresAt까지 포함해 판정한다", () => {
  const now = new Date("2026-08-09T03:00:00.000Z");
  const future = new Date("2026-08-09T03:30:00.000Z");
  const expired = new Date("2026-08-09T03:00:00.000Z");
  assert.equal(isAppsPaymentIntentExpired(future, now), false);
  assert.equal(isAppsPaymentIntentExpired(expired, now), true);
  assert.equal(createSafePaymentIntentResponse(validRequest.attemptId, "awaiting_authorization", future, now).paymentReady, true);
  const expiredResponse = createSafePaymentIntentResponse(validRequest.attemptId, "awaiting_authorization", expired, now);
  assert.equal(expiredResponse.expired, true);
  assert.equal(expiredResponse.paymentReady, false);
  assert.equal(createSafePaymentIntentResponse(validRequest.attemptId, "creating", future, now).paymentReady, false);
});

test("같은 payload와 mismatch를 판정한다", () => {
  const parsed = AppsPaymentPrepareRequestSchema.parse(validRequest);
  const checkout = { items: [{ productId: parsed.productId, selectedColor: parsed.selectedColor, selectedGauge: parsed.selectedGauge }], applicant: parsed.applicant, collectionMethod: parsed.collectionMethod, shipping: parsed.shipping, work: parsed.work };
  assert.equal(isSameAppsPaymentPayload(checkout, parsed), true);
  assert.equal(isSameAppsPaymentPayload({ ...checkout, work: { ...checkout.work, note: "변경" } }, parsed), false);
});
