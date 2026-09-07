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

