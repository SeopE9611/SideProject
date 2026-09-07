import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Dashboard 우선 확인은 기존 세 지표의 합계를 유지한다", () => {
  const dashboard = read("app/admin/dashboard/_components/AdminDashboardClient_view.tsx");

  assert.match(dashboard, /title="우선 확인"/);
  assert.doesNotMatch(dashboard, /title="긴급 확인"/);
  assert.match(
    dashboard,
    /data\.kpi\.queue\.cancelRequests \+ data\.kpi\.queue\.paymentPending24h \+ data\.kpi\.queue\.rentalOverdue/,
  );
});

test("Operations 긴급은 warn signal을 가진 대표 그룹으로 집계한다", () => {
  const handler = read("app/api/admin/operations/lib/operationsGetHandler.ts");

  assert.match(handler, /group\.signals\.some\(\(signal\) => signal\.level === "warn"\)/);
  assert.match(handler, /if \(isGroupWarn\(group\)\) acc\.urgent \+= 1/);
});

test("대표 업무 경량 집계는 비종결 상태와 완료 후 배송 후속조치를 포함한다", () => {
  const counts = read("app/api/admin/_lib/adminOperationCounts.ts");

  assert.match(counts, /const orderRepresentativeGroupFilter/);
  assert.match(counts, /const rentalRepresentativeGroupFilter/);
  assert.match(counts, /const standaloneStringingRepresentativeGroupFilter/);
  assert.match(counts, /"shippingInfo\.returnTrackingNo"/);
  assert.match(counts, /packageRepresentativeRows/);
  assert.match(counts, /operations: operationGroupCounts\.totalRepresentativeTasks/);
});

test("구매확정 주문도 외부 결제취소 finalization이 남으면 대표 업무에 포함한다", () => {
  const counts = read("app/api/admin/_lib/adminOperationCounts.ts");
  const finalization = read("lib/orders/cancel-finalization.ts");
  const handler = read("app/api/admin/operations/lib/operationsGetHandler.ts");

  assert.match(counts, /const orderCancelFinalizationRequiredFilter/);
  assert.match(
    counts,
    /orderCancelFinalizationRequiredFilter,[\s\S]*ORDER_CONFIRMED_TERMINAL_VALUES/,
  );
  assert.match(counts, /EXTERNALLY_CANCELED_PAYMENT_STATUS/);
  assert.match(counts, /EXTERNALLY_CANCELED_PAYMENT_INFO_STATUSES/);
  assert.match(counts, /CANCEL_FINALIZED_ORDER_STATUS_VALUES/);
  assert.match(finalization, /export const EXTERNALLY_CANCELED_PAYMENT_STATUS/);
  assert.match(finalization, /export const CANCEL_FINALIZED_ORDER_STATUS_VALUES/);
  assert.match(handler, /if \(item\.needsCancelFinalization\) return false/);
});

test("완료 교체서비스의 모든 방문수령 필드는 배송 후속 대표 업무에서 제외한다", () => {
  const counts = read("app/api/admin/_lib/adminOperationCounts.ts");
  const handler = read("app/api/admin/operations/lib/operationsGetHandler.ts");

  for (const field of [
    "collectionMethod",
    "shippingInfo.collectionMethod",
    "shippingInfo.shippingMethod",
    "shippingInfo.deliveryMethod",
    "shippingInfo.pickupMethod",
    "shippingInfo.servicePickupMethod",
  ]) {
    assert.ok(counts.includes(field), `${field} 경량 필터가 필요합니다.`);
  }

  assert.match(handler, /shippingInfo\?\.deliveryMethod/);
  assert.match(handler, /shippingInfo\?\.pickupMethod/);
  assert.match(handler, /shippingInfo\?\.servicePickupMethod/);
  assert.match(handler, /if \(item\.shippingFollowupRequired\) return false/);
});

test("반납완료 대여는 보증금 환불 완료 여부에 따라 대표 업무를 분류한다", () => {
  const counts = read("app/api/admin/_lib/adminOperationCounts.ts");
  const handler = read("app/api/admin/operations/lib/operationsGetHandler.ts");

  assert.match(counts, /const rentalDepositRefundRequiredFilter/);
  assert.match(counts, /depositRefundedAt: \{ \$exists: false \}/);
  assert.match(handler, /if \(!isRentalReturnedStatus\(item\.statusLabel\)\) return false/);
  assert.match(handler, /return Boolean\(item\.depositRefundedAt\)/);
});
