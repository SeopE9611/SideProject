import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

async function importOperationsClassification() {
  const source = read("lib/admin/operations-group-classification.ts");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("Dashboard 문서 신호 합계는 대표 업무 수와 구분한다", () => {
  const dashboard = read("app/admin/dashboard/_components/AdminDashboardClient_view.tsx");

  assert.match(dashboard, /title="우선 확인 신호"/);
  assert.doesNotMatch(dashboard, /title="긴급 확인"/);
  assert.match(dashboard, /문서별 신호는 같은 대표 업무에 중복될 수 있으며/);
  assert.match(
    dashboard,
    /data\.kpi\.queue\.cancelRequests \+ data\.kpi\.queue\.paymentPending24h \+ data\.kpi\.queue\.rentalOverdue/,
  );
});

test("Operations 데이터 오류는 warn signal을 가진 대표 그룹으로 집계한다", () => {
  const handler = read("app/api/admin/operations/lib/operationsGetHandler.ts");
  const client = read("app/admin/operations/_components/OperationsClient.tsx");

  assert.match(handler, /group\.signals\.some\(\(signal\) => signal\.level === "warn"\)/);
  assert.match(handler, /if \(isGroupWarn\(group\)\) acc\.dataIssue \+= 1/);
  assert.match(client, /dataIssue: "데이터 오류"/);
  assert.doesNotMatch(client, /dailyTodoLabels:\s*\{[\s\S]*?urgent: "긴급"/);
});

test("Operations 빠른 보기와 신호 집계는 같은 대표 그룹 판정을 사용한다", async () => {
  const { countOperationSignalGroups, matchesOperationsQuickView } =
    await importOperationsClassification();
  const item = (overrides = {}) => ({
    id: overrides.id ?? crypto.randomUUID(),
    kind: "order",
    statusLabel: "대기중",
    items: [],
    ...overrides,
  });
  const group = (items, overrides = {}) => ({
    items,
    groupQueueBucket: "pending",
    linkedFlowStatusIssue: null,
    ...overrides,
  });

  const payment = group([item({ paymentNeedsCheck: true })]);
  const packagePayment = group([
    item({
      kind: "package_purchase",
      paymentLabel: "결제대기",
      statusLabel: "활성화대기",
    }),
  ]);
  const shipping = group([
    item({ hasOutboundTracking: false, nextAction: "인도 운송장 등록 필요" }),
  ]);
  const rental = group([
    item({ kind: "rental", statusLabel: "대여중", nextAction: "반납 확인 필요" }),
  ]);
  const cancel = group([item({ cancel: { status: "requested" } })]);
  const linkedIssue = group([item()], {
    linkedFlowStatusIssue: { code: "LINKED_STATUS_MISMATCH" },
  });
  const stringing = group([item({ kind: "stringing_application", statusLabel: "작업 중" })]);
  const groups = [payment, packagePayment, shipping, rental, cancel, linkedIssue, stringing];

  assert.deepEqual(countOperationSignalGroups(groups), {
    cancelRequests: 1,
    paymentCheck: 1,
    packagePaymentCheck: 1,
    shippingMissing: 1,
    stringingWork: 1,
    rentalDue: 1,
    linkedReview: 1,
    offline: 0,
    academyApplications: 0,
  });
  assert.equal(matchesOperationsQuickView(payment, "paymentCheck"), true);
  assert.equal(matchesOperationsQuickView(packagePayment, "paymentCheck"), false);
  assert.equal(matchesOperationsQuickView(shipping, "shippingMissing"), true);
  assert.equal(matchesOperationsQuickView(rental, "rentalDue"), true);
  assert.equal(matchesOperationsQuickView(linkedIssue, "linkedIssues"), true);
});

test("Operations 빠른 보기는 서버 페이지네이션 전에 적용한다", () => {
  const handler = read("app/api/admin/operations/lib/operationsGetHandler.ts");
  const client = read("app/admin/operations/_components/OperationsClient.tsx");

  assert.match(handler, /const view = parseQuickView\(url\.searchParams\.get\("view"\)\)/);
  assert.match(
    handler,
    /groups = groups\.filter\(\(group\) => matchesOperationsQuickView\(group, view\)\)/,
  );
  assert.match(client, /view: activeQuickView === "all" \? undefined : activeQuickView/);
  assert.match(client, /resultLabel=[\s\S]*?totalGroups\.toLocaleString/);
});

test("Operations 문제 유형 문구는 서로 다른 집계 축을 구분한다", () => {
  const client = read("app/admin/operations/_components/OperationsClient.tsx");

  assert.match(client, /<SelectItem value="warn">데이터 오류만<\/SelectItem>/);
  assert.match(client, /<SelectItem value="caution" disabled=\{onlyWarn\}>\s*우선 확인만/);
  assert.match(client, /<SelectItem value="review" disabled=\{onlyWarn\}>\s*검수 신호만/);
  assert.match(client, /label: "긴급",\s*description: "SLA 긴급 기준 초과",\s*tone: "danger"/);
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
