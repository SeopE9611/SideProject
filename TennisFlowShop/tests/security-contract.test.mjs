import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

// UI 콜백·공통 fetcher·서버 CSRF 검증기를 격리 실행한다. 실제 네트워크와 PG는 제공하지 않는다.
function loadSecurityTs(source, dependencies = {}, globals = {}) {
  const compiledModule = { exports: {} };
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(`(function(require,module,exports){${outputText}\n})`, { Headers, Request, Response, URL, ...globals })((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `미지정 의존성: ${id}`);
    return dependencies[id];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
function niceSyncSecurityFixture(options = {}) {
  const origin = "https://synthetic.invalid";
  const clientToken = options.clientToken ?? "synthetic-csrf";
  const serverToken = options.serverToken ?? clientToken;
  const csrfKeys = loadSecurityTs(read("lib/admin/adminCsrf.ts"));
  const csrf = loadSecurityTs(read("lib/admin/verifyAdminCsrf.ts"), {
    "next/server": { NextResponse: Response },
    "@/lib/admin/adminCsrf": csrfKeys,
    "@/lib/admin/portfolio-demo-readonly.server": { getPortfolioDemoAdminMutationBlock: () => null },
  }, { process: { env: { ADMIN_CSRF_ORIGIN_ALLOWLIST: origin } } });
  const calls = { requests: 0, syncs: 0, refreshes: 0, cacheRefreshes: 0, success: [], errors: [], loading: [] };
  const route = loadSecurityTs(read("app/api/payments/nice/sync/[orderId]/route.ts"), {
    "@/lib/admin.guard": { requireAdmin: async () => ({ ok: true }) },
    "@/lib/admin/verifyAdminCsrf": csrf,
    "@/lib/payments/nice/syncOrder": { syncNicePaymentByOrderId: async (id) => {
      assert.equal(id, "synthetic-order");
      calls.syncs++;
      return Response.json(options.payload ?? { success: true }, { status: options.status ?? 200 });
    } },
  });
  const fetcher = loadSecurityTs(read("lib/admin/adminFetcher.ts"), { "@/lib/admin/adminCsrf": csrfKeys }, {
    document: { cookie: clientToken ? `${csrfKeys.ADMIN_CSRF_COOKIE_KEY}=${clientToken}` : "" },
    fetch: async (path, init) => {
      calls.requests++;
      assert.equal(path, "/api/payments/nice/sync/synthetic-order");
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "include");
      assert.equal(init.headers.get(csrfKeys.ADMIN_CSRF_HEADER_KEY), clientToken || null);
      const headers = new Headers(init.headers);
      headers.set("origin", options.origin ?? origin);
      if (serverToken) headers.set("cookie", `${csrfKeys.ADMIN_CSRF_COOKIE_KEY}=${serverToken}`);
      return route.POST(new Request(`${origin}${path}`, { ...init, headers }), { params: Promise.resolve({ orderId: "synthetic-order" }) });
    },
  });
  const file = ts.createSourceFile("OrderDetailClient.tsx", read("app/features/orders/components/OrderDetailClient.tsx"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  let callback;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "handleNiceSync") callback = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(callback, "실제 handleNiceSync 콜백을 검증해야 합니다.");
  const handler = loadSecurityTs(`export const run = ${callback.getText(file)};`, {}, {
    adminMutator: fetcher.adminMutator,
    readOnly: options.readOnly ?? false,
    orderDetail: options.missingOrder ? null : { _id: "synthetic-order" },
    isSyncingNice: options.isSyncingNice ?? false,
    setIsSyncingNice: (value) => calls.loading.push(value),
    mutateOrder: async () => { calls.refreshes++; },
    mutateGlobal: async (predicate) => {
      assert.equal(predicate("/api/orders/synthetic-order"), true);
      assert.equal(predicate("/api/admin/operations?limit=20"), true);
      assert.equal(predicate("/api/products"), false);
      calls.cacheRefreshes++;
    },
    showSuccessToast: (message) => calls.success.push(message),
    showErrorToast: (message) => calls.errors.push(message),
  });
  return { calls, run: handler.run };
}

test("주문 PG 재동기화는 adminMutator로 CSRF를 전달하고 기존 성공 처리를 유지한다", async () => {
  const { calls, run } = niceSyncSecurityFixture();
  await run();
  assert.equal(calls.requests, 1);
  assert.equal(calls.syncs, 1);
  assert.equal(calls.refreshes, 1);
  assert.equal(calls.cacheRefreshes, 1);
  assert.deepEqual(calls.success, ["PG 결제 상태를 확인했습니다."]);
  assert.deepEqual(calls.errors, []);
  assert.deepEqual(calls.loading, [true, false]);
  const sync = read("lib/payments/nice/syncOrder.ts");
  assert.ok(sync.includes("getNicePaymentByTid"));
  assert.doesNotMatch(sync, /cancelNicePaymentByTid|approveNicePaymentByTid/);
});
for (const options of [{ clientToken: "" }, { serverToken: "mismatch" }, { origin: "https://untrusted.invalid" }]) {
  test(`주문 PG 재동기화의 CSRF 실패는 조회 전에 차단한다: ${JSON.stringify(options)}`, async () => {
    const { calls, run } = niceSyncSecurityFixture(options);
    await run();
    assert.equal(calls.syncs, 0);
    assert.equal(calls.refreshes, 0);
    assert.equal(calls.cacheRefreshes, 0);
    assert.deepEqual(calls.success, []);
    assert.deepEqual(calls.errors, ["Forbidden"]);
    assert.deepEqual(calls.loading, [true, false]);
  });
}
for (const options of [{ status: 502, payload: { error: "모의 조회 오류" } }, { status: 200, payload: { success: false, error: "모의 동기화 실패" } }]) {
  test(`주문 PG 재동기화의 HTTP·업무 실패는 오류 토스트와 로딩 해제를 유지한다: ${options.status}`, async () => {
    const { calls, run } = niceSyncSecurityFixture(options);
    await run();
    assert.equal(calls.syncs, 1);
    assert.equal(calls.refreshes, 0);
    assert.equal(calls.cacheRefreshes, 0);
    assert.deepEqual(calls.success, []);
    assert.deepEqual(calls.errors, [options.payload.error]);
    assert.deepEqual(calls.loading, [true, false]);
  });
}
for (const options of [{ readOnly: true }, { isSyncingNice: true }, { missingOrder: true }]) {
  test(`주문 PG 재동기화의 읽기 전용·중복·주문 없음 차단을 유지한다: ${JSON.stringify(options)}`, async () => {
    const { calls, run } = niceSyncSecurityFixture(options);
    await run();
    assert.equal(calls.requests, 0);
    assert.deepEqual(calls.loading, []);
    assert.deepEqual(calls.errors, []);
  });
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
  assert.ok(verifyAdminCsrf.includes("return { ok: false, res: forbiddenResponse() };"));

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
    assert.ok(
      !src.includes("verifyAdminCsrf("),
      `${label}: 고객/PG 플로우에 관리자 CSRF를 요구하면 안 됩니다.`,
    );
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

  assert.ok(flowStatus.includes("export const normalizeStatusText = (status?: unknown) =>"));
  assert.ok(
    flowStatus.includes(
      'export const ORDER_DELIVERED_MONITORING_VALUES = ["배송완료", "delivered"] as const;',
    ),
  );

  const flowTerminalBlocks = [
    "ORDER_CONFIRMED_TERMINAL_VALUES",
    "ORDER_CANCELED_TERMINAL_VALUES",
    "ORDER_REFUNDED_TERMINAL_VALUES",
  ];
  for (const blockName of flowTerminalBlocks) {
    const blockMatch = flowStatus.match(
      new RegExp(`export const ${blockName} = \\[([\\s\\S]*?)\\] as const;`),
    );
    assert.ok(blockMatch, `${blockName} 상수를 찾아야 합니다.`);
    assert.ok(
      !blockMatch[1].includes('"배송완료"'),
      `${blockName}: 배송완료는 terminal이 아니어야 합니다.`,
    );
    assert.ok(
      !blockMatch[1].includes('"delivered"'),
      `${blockName}: delivered는 terminal이 아니어야 합니다.`,
    );
  }
  assert.ok(flowStatus.includes('"구매확정"'));
  assert.ok(flowStatus.includes('"confirmed"'));
  assert.ok(flowStatus.includes('"purchase_confirmed"'));
  assert.ok(flowStatus.includes('"work_done"'));
  assert.ok(flowStatus.includes('"반납완료"'));

  const terminalValuesMatch = operationCounts.match(
    /const TERMINAL_STATUS_VALUES = \[([\s\S]*?)\];/,
  );
  assert.ok(terminalValuesMatch, "TERMINAL_STATUS_VALUES 상수를 찾아야 합니다.");

  const terminalValuesBody = terminalValuesMatch[1];
  assert.ok(!terminalValuesBody.includes('"배송완료"'));
  assert.ok(!terminalValuesBody.includes('"delivered"'));
  assert.ok(terminalValuesBody.includes("...ORDER_CONFIRMED_TERMINAL_VALUES"));
  assert.ok(terminalValuesBody.includes("...ORDER_CANCELED_TERMINAL_VALUES"));
  assert.ok(terminalValuesBody.includes("...ORDER_REFUNDED_TERMINAL_VALUES"));
  assert.ok(operationCounts.includes("ORDER_DELIVERED_MONITORING_VALUES"));
  assert.ok(operationCounts.includes("...ORDER_DELIVERED_MONITORING_VALUES"));

  const orderTerminalMatch = operationsGetHandler.match(
    /function isOrderTerminalStatus[\s\S]*?function isClosedForNicePaymentSync/,
  );
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
    assert.ok(
      src.includes('from "@/lib/status/flow-status"'),
      `${label}: 고객 화면은 공통 상태 유틸을 import해야 합니다.`,
    );
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
    assert.ok(
      src.includes("isOrderConfirmedStatus"),
      `${label}: 리뷰 가능 주문 판정은 공통 구매확정 유틸을 사용해야 합니다.`,
    );
  }

  assert.ok(activityTodo.includes("isOrderConfirmedStatus(params.status)"));
  assert.ok(activityTodo.includes("isOrderDeliveredStatus(params.status)"));
  assert.ok(activityTodo.includes("isStringingCompletedStatus(app.status)"));
  assert.ok(activityTodo.includes("isRentalReturnedStatus(params.status)"));

  for (const [label, src] of [
    ["stringing confirm", stringingConfirm],
    ["order confirm", orderConfirm],
  ]) {
    assert.ok(
      src.includes('from "@/lib/status/flow-status"'),
      `${label}: 공통 상태 유틸을 import해야 합니다.`,
    );
    assert.ok(
      src.includes("isOrderConfirmedStatus"),
      `${label}: 주문 구매확정 판정은 공통 유틸을 사용해야 합니다.`,
    );
    assert.ok(
      !src.includes('status === "구매확정"'),
      `${label}: 구매확정 직접 비교를 두면 안 됩니다.`,
    );
    assert.ok(
      !src.includes("const normalizeStatusText ="),
      `${label}: 로컬 normalize helper를 두면 안 됩니다.`,
    );
    assert.ok(
      !src.includes("const isStringingCompletedStatus ="),
      `${label}: 로컬 완료 helper를 두면 안 됩니다.`,
    );
    assert.ok(
      !src.includes("const isStringingCanceledStatus ="),
      `${label}: 로컬 취소 helper를 두면 안 됩니다.`,
    );
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
