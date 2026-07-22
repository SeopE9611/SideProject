import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function normalized(source) {
  return source.replace(/\s+/g, " ");
}

test("마이페이지 활동 API는 결제 원본 상태와 명시적 금액을 분리해 고객용 결제 라벨을 계산한다", () => {
  const route = normalized(read("app/api/mypage/activity/route.ts"));

  assert.ok(route.includes("function resolveRawPaymentStatus(doc: any): string | null"));
  assert.ok(route.includes("doc?.paymentStatus) ?? nullableTrim(doc?.paymentInfo?.status)"));
  assert.ok(route.includes("function toNullableFiniteNumber(value: unknown): number | null"));
  assert.ok(route.includes("getCustomerOrderPaymentStatusLabel({"));
  assert.ok(!route.includes('return "결제대기";'));
});

test("취소된 연결 신청서는 이력으로 보존하면서 활성 연결·할 일 계산에서 제외한다", () => {
  const route = normalized(read("app/api/mypage/activity/route.ts"));
  const counts = normalized(read("app/api/mypage/activity/counts/route.ts"));
  const summary = normalized(read("app/api/mypage/summary/route.ts"));

  assert.ok(route.includes("applicationHistorySummaries: applicationHistory"));
  assert.ok(route.includes("const linkedApps = activeApplications(applicationHistory);"));
  assert.ok(route.includes("isApplicationEligibleForLinkedStage({ status: app.status"));
  assert.ok(counts.includes("isApplicationEligibleForLinkedStage({ status: doc.status"));
  assert.ok(summary.includes("isApplicationEligibleForLinkedStage({ status: doc.status"));
});

test("주문·대여 진행 상태와 결제 상태를 별도 배지로 보여주고 주문 교체서비스 신청 CTA를 제공한다", () => {
  const list = normalized(read("app/mypage/tabs/TransactionFlowList.tsx"));
  const todo = normalized(read("lib/mypage/activity-todo.ts"));

  assert.ok(list.includes("getCustomerOrderStatusLabel(status)"));
  assert.ok(list.includes("getCustomerRentalStatusLabel(status)"));
  assert.ok(list.includes("g.order?.paymentStatusLabel"));
  assert.ok(list.includes("g.todoReasonCode === \"order_stringing_apply\""));
  assert.ok(list.includes("`/services/apply?orderId=${orderId}`"));
  assert.ok(!list.includes('return "결제대기";'));
  assert.ok(todo.includes('"order_stringing_apply"'));
});
