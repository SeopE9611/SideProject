import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("보안 계약: CSRF 실패, Origin 불일치, 토큰 오류, 재전송(멱등성) 케이스를 강제한다", () => {
  const verifyAdminCsrf = read("lib/admin/verifyAdminCsrf.ts");
  const adminGuard = read("lib/admin.guard.ts");
  const packageOrders = read("app/api/packages/orders/route.ts");

  // 단일 표준 키 계약: 서버/클라이언트 모두 공통 상수를 사용한다.
  const adminFetcher = read("lib/admin/adminFetcher.ts");
  const adminCsrf = read("lib/admin/adminCsrf.ts");
  assert.ok(adminCsrf.includes('export const ADMIN_CSRF_COOKIE_KEY = "adminCsrfToken";'));
  assert.ok(adminCsrf.includes('export const ADMIN_CSRF_HEADER_KEY = "x-admin-csrf-token";'));
  assert.ok(verifyAdminCsrf.includes("ADMIN_CSRF_COOKIE_KEY"));
  assert.ok(verifyAdminCsrf.includes("ADMIN_CSRF_HEADER_KEY"));
  assert.ok(adminFetcher.includes("ADMIN_CSRF_COOKIE_KEY"));
  assert.ok(adminFetcher.includes("ADMIN_CSRF_HEADER_KEY"));
  // CSRF 실패 + Origin allowlist 불일치 시 403
  assert.ok(verifyAdminCsrf.includes("if (!requestOrigin || !originAllowlist.has(requestOrigin))"));
  assert.ok(verifyAdminCsrf.includes("if (!headerToken || !cookieToken)"));
  assert.ok(verifyAdminCsrf.includes("if (headerToken !== cookieToken)"));
  assert.ok(verifyAdminCsrf.includes("return { ok: true };"));
  assert.ok(
    verifyAdminCsrf.includes(
      'return NextResponse.json({ message: "Forbidden" }, { status: 403 });',
    ),
  );
  assert.ok(verifyAdminCsrf.includes('return { ok: false, res: forbiddenResponse() };'));

  // 잘못된/만료 토큰은 401, 관리자 아님은 403
  assert.ok(adminGuard.includes("if (!at) return null;"));
  assert.ok(adminGuard.includes("if (!payload) return { ok: false, res: authError(401) };"));
  assert.ok(adminGuard.includes("payloadRaw = verifyAccessToken(at);"));
  assert.ok(
    adminGuard.includes("if (!parsedPayload || !ObjectId.isValid(parsedPayload.sub)) return null;"),
  );
  assert.ok(adminGuard.includes("return { ok: false, res: authError(401) };"));
  assert.ok(adminGuard.includes("if (!admin) {"));
  assert.ok(adminGuard.includes("return { ok: false, res: authError(403) };"));

  // 재전송 멱등성: Idempotency-Key로 기존 주문 재사용
  assert.ok(packageOrders.includes('const idem = req.headers.get("Idempotency-Key") || "";'));
  assert.ok(packageOrders.includes('"meta.idemKey": idem'));
  assert.ok(packageOrders.includes("reused: true"));
});

test("관리자 결제 동기화/정산 변경 API는 표준 CSRF 검증을 사용한다", () => {
  const adminNiceOrderSync = read("app/api/admin/payments/nice/sync/[orderId]/route.ts");
  const niceOrderSync = read("app/api/payments/nice/sync/[orderId]/route.ts");
  const niceRentalSync = read("app/api/payments/nice/rental/sync/[rentalId]/route.ts");
  const nicePackageSync = read("app/api/payments/nice/package/sync/[packageOrderId]/route.ts");
  const settlementMonth = read("app/api/settlements/[yyyymm]/route.ts");
  const settlementBulkDelete = read("app/api/settlements/bulk-delete/route.ts");
  const nicePrepare = read("app/api/payments/nice/prepare/route.ts");
  const niceReturn = read("app/api/payments/nice/return/route.ts");
  const niceRentalPrepare = read("app/api/payments/nice/rental/prepare/route.ts");
  const niceRentalReturn = read("app/api/payments/nice/rental/return/route.ts");
  const nicePackagePrepare = read("app/api/payments/nice/package/prepare/route.ts");
  const nicePackageReturn = read("app/api/payments/nice/package/return/route.ts");

  for (const [label, src] of [
    ["admin nice order sync", adminNiceOrderSync],
    ["nice order sync", niceOrderSync],
    ["nice rental sync", niceRentalSync],
    ["nice package sync", nicePackageSync],
    ["settlement month", settlementMonth],
    ["settlement bulk delete", settlementBulkDelete],
  ]) {
    assert.ok(src.includes("requireAdmin("), `${label}: 관리자 표준 인증을 사용해야 합니다.`);
    assert.ok(src.includes("verifyAdminCsrf("), `${label}: 관리자 CSRF 검증을 사용해야 합니다.`);
  }

  assert.ok(!settlementMonth.includes(".startsWith(allow)"));
  assert.ok(!settlementBulkDelete.includes(".startsWith(allow)"));

  for (const [label, src] of [
    ["nice prepare", nicePrepare],
    ["nice return", niceReturn],
    ["nice rental prepare", niceRentalPrepare],
    ["nice rental return", niceRentalReturn],
    ["nice package prepare", nicePackagePrepare],
    ["nice package return", nicePackageReturn],
  ]) {
    assert.ok(!src.includes("verifyAdminCsrf("), `${label}: 고객/PG 플로우에 관리자 CSRF를 요구하면 안 됩니다.`);
  }
});


test("운영 카운트 계약: 배송완료 주문은 terminal 제외가 아니라 구매확정 대기 모니터링 대상으로 유지한다", () => {
  const flowStatus = read("lib/status/flow-status.ts");
  const operationCounts = read("app/api/admin/_lib/adminOperationCounts.ts");
  const operationsGetHandler = read("app/api/admin/operations/lib/operationsGetHandler.ts");
  const stringingConfirm = read("app/api/applications/stringing/[id]/confirm/route.ts");
  const orderConfirm = read("app/api/orders/[id]/confirm/route.ts");
  const orderRoute = read("app/api/orders/[id]/route.ts");
  const stringingHandlers = read("app/features/stringing-applications/api/handlers.ts");
  const orderList = read("app/mypage/tabs/OrderList.tsx");
  const activityFeed = read("app/mypage/tabs/ActivityFeed.tsx");
  const transactionFlowList = read("app/mypage/tabs/TransactionFlowList.tsx");
  const activityRoute = read("app/api/mypage/activity/route.ts");
  const activityCounts = read("app/api/mypage/activity/counts/route.ts");
  const summaryRoute = read("app/api/mypage/summary/route.ts");
  const activityTodo = read("lib/mypage/activity-todo.ts");

  assert.ok(flowStatus.includes('export const normalizeStatusText = (status?: unknown) =>'));
  assert.ok(flowStatus.includes('export const ORDER_DELIVERED_MONITORING_VALUES = ["배송완료", "delivered"] as const;'));

  const flowTerminalBlocks = [
    "ORDER_CONFIRMED_TERMINAL_VALUES",
    "ORDER_CANCELED_TERMINAL_VALUES",
    "ORDER_REFUNDED_TERMINAL_VALUES",
  ];
  for (const blockName of flowTerminalBlocks) {
    const blockMatch = flowStatus.match(new RegExp(`export const ${blockName} = \\[([\\s\\S]*?)\\] as const;`));
    assert.ok(blockMatch, `${blockName} 상수를 찾아야 합니다.`);
    assert.ok(!blockMatch[1].includes('"배송완료"'), `${blockName}: 배송완료는 terminal이 아니어야 합니다.`);
    assert.ok(!blockMatch[1].includes('"delivered"'), `${blockName}: delivered는 terminal이 아니어야 합니다.`);
  }
  assert.ok(flowStatus.includes('"구매확정"'));
  assert.ok(flowStatus.includes('"confirmed"'));
  assert.ok(flowStatus.includes('"purchase_confirmed"'));
  assert.ok(flowStatus.includes('"work_done"'));
  assert.ok(flowStatus.includes('"반납완료"'));

  const terminalValuesMatch = operationCounts.match(/const TERMINAL_STATUS_VALUES = \[([\s\S]*?)\];/);
  assert.ok(terminalValuesMatch, "TERMINAL_STATUS_VALUES 상수를 찾아야 합니다.");

  const terminalValuesBody = terminalValuesMatch[1];
  assert.ok(!terminalValuesBody.includes('"배송완료"'));
  assert.ok(!terminalValuesBody.includes('"delivered"'));
  assert.ok(terminalValuesBody.includes("...ORDER_CONFIRMED_TERMINAL_VALUES"));
  assert.ok(terminalValuesBody.includes("...ORDER_CANCELED_TERMINAL_VALUES"));
  assert.ok(terminalValuesBody.includes("...ORDER_REFUNDED_TERMINAL_VALUES"));
  assert.ok(operationCounts.includes('ORDER_DELIVERED_MONITORING_VALUES'));
  assert.ok(operationCounts.includes("...ORDER_DELIVERED_MONITORING_VALUES"));

  const orderTerminalMatch = operationsGetHandler.match(/function isOrderTerminalStatus[\s\S]*?function isClosedForNicePaymentSync/);
  assert.ok(orderTerminalMatch, "isOrderTerminalStatus helper를 찾아야 합니다.");
  assert.ok(orderTerminalMatch[0].includes("isSharedOrderTerminalStatus(status)"));
  assert.ok(!orderTerminalMatch[0].includes("delivered"));
  assert.ok(!orderTerminalMatch[0].includes("배송완료"));
  assert.ok(operationsGetHandler.includes("isStringingCompletedStatus"));
  assert.ok(operationsGetHandler.includes("isStringingCanceledStatus"));
  assert.ok(operationsGetHandler.includes("isRentalReturnedStatus"));


  for (const [label, src] of [
    ["mypage OrderList", orderList],
    ["mypage ActivityFeed", activityFeed],
    ["mypage TransactionFlowList", transactionFlowList],
  ]) {
    assert.ok(src.includes('from "@/lib/status/flow-status"'), `${label}: 고객 화면은 공통 상태 유틸을 import해야 합니다.`);
  }

  assert.ok(orderList.includes("isOrderDeliveredStatus(order.status)"));
  assert.ok(orderList.includes("isOrderConfirmedStatus(order.status)"));
  assert.ok(activityFeed.includes("isOrderDeliveredStatus(status)"));
  assert.ok(activityFeed.includes("isOrderConfirmedStatus(status)"));
  assert.ok(activityFeed.includes("isStringingCompletedStatus(app.status)"));
  assert.ok(activityFeed.includes("isRentalReturnedStatus(s)"));
  assert.ok(transactionFlowList.includes("isOrderDeliveredStatus(g.order?.status)"));
  assert.ok(transactionFlowList.includes("isOrderConfirmedStatus(g.order?.status)"));

  for (const [label, src] of [
    ["mypage activity route", activityRoute],
    ["mypage activity counts", activityCounts],
    ["mypage summary", summaryRoute],
  ]) {
    assert.ok(src.includes("isOrderConfirmedStatus"), `${label}: 리뷰 가능 주문 판정은 공통 구매확정 유틸을 사용해야 합니다.`);
  }

  assert.ok(activityTodo.includes("isOrderConfirmedStatus(params.status)"));
  assert.ok(activityTodo.includes("isOrderDeliveredStatus(params.status)"));
  assert.ok(activityTodo.includes("isStringingCompletedStatus(app.status)"));
  assert.ok(activityTodo.includes("isRentalReturnedStatus(params.status)"));

  for (const [label, src] of [
    ["stringing confirm", stringingConfirm],
    ["order confirm", orderConfirm],
  ]) {
    assert.ok(src.includes('from "@/lib/status/flow-status"'), `${label}: 공통 상태 유틸을 import해야 합니다.`);
    assert.ok(src.includes("isOrderConfirmedStatus"), `${label}: 주문 구매확정 판정은 공통 유틸을 사용해야 합니다.`);
    assert.ok(!src.includes('status === "구매확정"'), `${label}: 구매확정 직접 비교를 두면 안 됩니다.`);
    assert.ok(!src.includes("const normalizeStatusText ="), `${label}: 로컬 normalize helper를 두면 안 됩니다.`);
    assert.ok(!src.includes("const isStringingCompletedStatus ="), `${label}: 로컬 완료 helper를 두면 안 됩니다.`);
    assert.ok(!src.includes("const isStringingCanceledStatus ="), `${label}: 로컬 취소 helper를 두면 안 됩니다.`);
  }

  assert.ok(orderRoute.includes("isOrderConfirmedStatus(existing.status)"));
  assert.ok(orderRoute.includes("isOrderCanceledStatus(existing.status)"));
  assert.ok(!orderRoute.includes('existing.status === "구매확정"'));
  assert.ok(!orderRoute.includes('existing.status === "취소"'));
  assert.ok(stringingHandlers.includes("isStringingCompletedStatus(appDoc.status)"));
  assert.ok(stringingHandlers.includes("isStringingCanceledStatus(appDoc.status)"));
  assert.ok(!stringingHandlers.includes('appDoc.status === "교체완료"'));
  assert.ok(!stringingHandlers.includes('appDoc.status === "취소"'));
});

test("상태 라벨 계약: 주요 raw status는 고객/관리자 표시용 한글 라벨로 매핑한다", () => {
  const baseLabels = read("lib/status-labels/base.ts");
  const mypageLabels = read("app/mypage/_lib/status-label.ts");
  const flowDisplay = read("app/mypage/_lib/flow-display.ts");
  const adminLabels = read("lib/admin/status-labels.ts");
  const badgeStyle = read("lib/badge-style.ts");
  const operationsClient = read("app/admin/operations/_components/OperationsClient.tsx");
  const activityFeed = read("app/mypage/tabs/ActivityFeed.tsx");
  const transactionFlowList = read("app/mypage/tabs/TransactionFlowList.tsx");

  for (const [raw, label] of [
    ["purchase_confirmed", "구매확정"],
    ["confirmed", "구매확정"],
    ["delivered", "배송완료"],
    ["refund_completed", "환불완료"],
    ["refunded", "환불완료"],
    ["partial_canceled", "부분취소"],
    ["partialcanceled", "부분취소"],
    ["partial_cancelled", "부분취소"],
  ]) {
    assert.ok(
      baseLabels.includes(`${raw}: "${label}"`),
      `base order/payment label: ${raw} -> ${label}`,
    );
  }

  for (const raw of ["completed", "done", "work_done"]) {
    assert.ok(
      baseLabels.includes(`${raw}: "교체완료"`),
      `base stringing label: ${raw} -> 교체완료`,
    );
    assert.ok(
      mypageLabels.includes(`${raw}: "교체완료"`),
      `mypage stringing label: ${raw} -> 교체완료`,
    );
  }

  assert.ok(
    baseLabels.includes('returned: "반납완료"'),
    "base rental label: returned -> 반납완료",
  );
  assert.ok(
    mypageLabels.includes('returned: "반납완료"'),
    "mypage rental label: returned -> 반납완료",
  );
  assert.ok(flowDisplay.includes('purchase_confirmed: "이용 완료"'));
  assert.ok(flowDisplay.includes('refund_completed: "환불 완료"'));
  assert.ok(flowDisplay.includes('work_done: "작업 완료"'));
  assert.ok(flowDisplay.includes('returned: "이용 완료"'));
  assert.ok(adminLabels.includes('["completed", "done", "work_done"].includes(lower)'));
  assert.ok(badgeStyle.includes('["completed", "done", "work_done"].includes(lower)'));

  for (const [label, src] of [
    ["operations client", operationsClient],
    ["mypage activity feed", activityFeed],
    ["mypage transaction flow list", transactionFlowList],
  ]) {
    assert.ok(
      src.includes("statusLabel") || src.includes("getMypageUserStatusLabel"),
      `${label}: 라벨 또는 배지 helper를 통해 상태를 표시해야 합니다.`,
    );
  }
});
