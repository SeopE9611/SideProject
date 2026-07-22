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
  assert.ok(list.includes("getCustomerRentalStatusLabel(rawStatus)"));
  assert.ok(list.includes("g.order?.paymentStatusLabel"));
  assert.ok(list.includes('g.todoReasonCode === "order_stringing_apply"'));
  assert.ok(list.includes("`/services/apply?orderId=${orderId}`"));
  assert.ok(!list.includes('return "결제대기";'));
  assert.ok(todo.includes('"order_stringing_apply"'));
});

test("결제 정보가 완전히 누락된 활동은 확인 중으로 표시하고 명시적 0원은 기존 정책을 유지한다", () => {
  const route = normalized(read("app/api/mypage/activity/route.ts"));

  assert.ok(route.includes("type ActivityPaymentStatusParams"));
  assert.ok(route.includes("function resolveActivityPaymentStatusLabel"));
  assert.ok(route.includes('return "결제 상태 확인 중"'));
  assert.ok(route.includes("const hasExplicitPaymentEvidence = Boolean("));
  assert.ok(route.includes("normalizedTotalPrice !== null && normalizedTotalPrice <= 0"));
  assert.ok(route.includes("if (!hasExplicitPaymentEvidence) return"));
  assert.ok(route.includes("paymentStatusLabel: resolveActivityPaymentStatusLabel({"));
});

test("통합 거래 카드가 표시 문구와 원본 상태 기반 배지 tone을 분리한다", () => {
  const list = normalized(read("app/mypage/tabs/TransactionFlowList.tsx"));

  assert.ok(list.includes("const rawStatus ="));
  assert.ok(list.includes(`getStatusBadgeSpec(g, rawStatus ?? "")`));
  assert.ok(
    list.includes(
      'getStatusBadgeSpec({ ...g, kind: "application" }, displayApplication?.status ?? "")',
    ),
  );
  assert.ok(!list.includes("getStatusBadgeSpec(g, userStatusLabel)"));
  assert.ok(
    !list.includes('getStatusBadgeSpec({ ...g, kind: "application" }, displayUserStatusLabel)'),
  );
});

test("방문 수령 주문은 원본 정규화 상태로 수령 진행 문구를 계산한다", () => {
  const list = normalized(read("app/mypage/tabs/TransactionFlowList.tsx"));
  const shipping = normalized(read("lib/order-shipping.ts"));

  assert.ok(list.includes("const getOrderProgressStatusLabel ="));
  assert.ok(list.includes("getOrderStatusLabelForDisplay(normalizedStatus, { shippingMethod })"));
  assert.ok(list.includes("getOrderProgressStatusLabel(rawStatus, g.order?.shippingMethod)"));
  assert.ok(!list.includes("getOrderStatusLabelForDisplay(userStatusLabel"));
  assert.ok(shipping.includes('if (status === "배송중") return "수령 준비중"'));
  assert.ok(shipping.includes('if (status === "배송완료") return "방문 수령 완료"'));
});

test("결제 상태 배지는 공용 의미 색상 spec을 모바일과 데스크톱에 적용한다", () => {
  const list = normalized(read("app/mypage/tabs/TransactionFlowList.tsx"));

  assert.ok(list.includes("getPaymentStatusBadgeSpec,"));
  assert.ok(list.includes("const paymentStatusBadgeSpec = paymentStatusLabel"));
  assert.ok(list.includes("variant={paymentStatusBadgeSpec.variant}"));
  assert.equal((list.match(/variant=\{paymentStatusBadgeSpec\.variant\}/g) ?? []).length, 2);
});
