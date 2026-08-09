import assert from "node:assert/strict";
import test from "node:test";

import {
  AppsPaymentPrepareRequestSchema,
  createSafePaymentIntentResponse,
  isSameAppsPaymentPayload,
} from "../lib/apps-in-toss/server/payment-prepare-contract";

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

test("safe response에는 결제 토큰, 사용자 키, 개인정보가 없다", () => {
  const response = createSafePaymentIntentResponse(validRequest.attemptId, "creating");
  assert.deepEqual(Object.keys(response), ["success", "attemptId", "state", "paymentReady"]);
  assert.equal(response.paymentReady, false);
  assert.equal(JSON.stringify(response).includes("payToken"), false);
  assert.equal(JSON.stringify(response).includes("userKey"), false);
  assert.equal(JSON.stringify(response).includes(validRequest.applicant.email), false);
});

test("같은 payload와 mismatch를 판정한다", () => {
  const parsed = AppsPaymentPrepareRequestSchema.parse(validRequest);
  const checkout = { items: [{ productId: parsed.productId, selectedColor: parsed.selectedColor, selectedGauge: parsed.selectedGauge }], applicant: parsed.applicant, collectionMethod: parsed.collectionMethod, shipping: parsed.shipping, work: parsed.work };
  assert.equal(isSameAppsPaymentPayload(checkout, parsed), true);
  assert.equal(isSameAppsPaymentPayload({ ...checkout, work: { ...checkout.work, note: "변경" } }, parsed), false);
});
