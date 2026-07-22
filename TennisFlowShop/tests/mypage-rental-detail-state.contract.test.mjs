import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function normalized(source) {
  return source.replace(/\s+/g, " ");
}

test("대여 상세 API는 결제 원본과 nullable 금액을 분리해 공용 결제 상태 정책을 사용한다", () => {
  const route = normalized(read("app/api/me/rentals/[id]/route.ts"));

  assert.ok(route.includes("getCustomerTransactionPaymentStatusLabel"));
  assert.ok(route.includes("function toNullableFiniteNumber(value: unknown): number | null"));
  assert.ok(route.includes("nullableTrim(doc?.paymentStatus) ?? nullableTrim(paymentInfo.status)"));
  assert.ok(!route.includes("nullableTrim((doc as any)?.paymentStatus ?? paymentInfo.status)"));
  assert.ok(route.includes("const totalAmount = explicitTotal ??"));
  assert.ok(!route.includes("amount: doc.amount"));
  for (const field of [
    "paymentStatusLabel",
    "totalAmount",
    "activeStringingApplicationId",
    "hasActiveStringingApplication",
    "applicationHistorySummary",
  ]) {
    assert.ok(route.includes(field));
  }
});

test("대여 상세 API는 활성 교체서비스와 취소 이력을 분리한다", () => {
  const route = normalized(read("app/api/me/rentals/[id]/route.ts"));

  assert.ok(route.includes("cancelRequest: 1"));
  assert.ok(route.includes("isApplicationEligibleForLinkedStage({"));
  assert.ok(route.includes("if (!hasActiveStringingApplication)"));
  assert.ok(route.includes("applicationHistorySummary = {"));
  assert.ok(route.includes("activeStringingApplicationId = appId"));
});

test("대여 상세 클라이언트는 진행·결제·교체서비스 상태를 독립적으로 표시한다", () => {
  const client = normalized(read("app/mypage/rentals/_components/RentalsDetailClient.tsx"));

  assert.ok(client.includes("getRentalStatusBadgeSpec(data.status)"));
  assert.ok(client.includes("getPaymentStatusBadgeSpec(paymentStatusLabel)"));
  assert.ok(client.includes("getApplicationStatusBadgeSpec(activeStringingStatus)"));
  assert.ok(!client.includes('variant="info"'));
  assert.ok(!client.includes("getStatusBadgeVariant"));
  assert.ok(client.includes("대여 진행 상태: ${rentalStatusLabel}"));
  assert.ok(client.includes("결제 상태: ${paymentStatusLabel}"));
  assert.ok(client.includes("withStringService && !data?.hasActiveStringingApplication"));
  assert.ok(client.includes("data?.activeStringingApplicationId"));
  assert.ok(!client.includes("결제 또는 입금 확인을 기다리고 있습니다."));
  assert.ok(client.includes('typeof total === "number" ? formatCurrency(total) : "금액 확인 중"'));
  assert.ok(client.includes("이전 교체서비스 신청:"));
});
