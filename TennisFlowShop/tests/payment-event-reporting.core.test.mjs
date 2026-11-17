import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";

// 기존 core 테스트와 동일하게 TS를 격리 로드한다. DB·PG 연결은 제공하지 않는다.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function load(path, dependencies = {}, globals = {}) {
  const compiledModule = { exports: {} };
  const { outputText } = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(`(function(require,module,exports){${outputText}\n})`, { Date, Response, URL, console: { info() {}, error() {} }, ...globals })((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `미지정 의존성: ${id}`);
    return dependencies[id];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const policy = load("app/api/settlements/_lib/settlementPolicy.ts");
const dates = load("lib/date/payment-event-date.ts");
const cancellations = load("lib/payments/nice/cancel-events.ts", { "node:crypto": { createHash }, "@/lib/date/payment-event-date": dates });
const events = load("app/api/settlements/_lib/paymentEvents.ts", {
  "@/lib/date/payment-event-date": dates,
  "@/lib/payments/nice/cancel-events": cancellations,
  "./settlementPolicy": policy,
  "@/app/api/admin/offline/_lib/packageOrderOffline": { EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER: { "meta.source": { $ne: "offline_admin" } } },
});
const paidAt = new Date("2026-10-31T23:00:00+09:00");
const canceledAt = "2026-11-14T13:00:00+09:00";
const order = (sync) => ({ paymentStatus: sync ? "결제취소" : "결제완료", totalPrice: 35000, paymentInfo: { approvedAt: paidAt, total: 35000, niceSync: sync } });
const canceled = () => order({ source: "manual_sync_api", pgStatus: "canceled", canceledAt, cancelAmount: 35000 });

test("정상 결제와 외부 전액 취소를 독립 이벤트로 보존한다", () => {
  assert.equal(events.paymentEventsForDocument("orders", order()).length, 1);
  const rows = events.paymentEventsForDocument("orders", canceled());
  assert.equal(rows.length, 2);
  assert.equal(rows[0].amount, 35000);
  assert.equal(rows[1].amount, 35000);
  assert.equal(rows[0].at.getTime(), paidAt.getTime());
  assert.equal(rows[1].at.getTime(), new Date(canceledAt).getTime());
});
test("중복 PG 조회는 이벤트를 누적하지 않는다", () => {
  const doc = canceled();
  assert.deepEqual(events.paymentEventsForDocument("orders", doc), events.paymentEventsForDocument("orders", doc));
});
test("부분 취소 후 잔액 취소는 마지막 금액을 전체 환불로 추정하지 않는다", () => {
  const doc = canceled();
  doc.paymentInfo.niceSync.cancelAmount = 20000;
  assert.equal(events.paymentEventsForDocument("orders", doc).filter((row) => row.kind === "refund").length, 0);
  doc.paymentInfo.niceSync.pgStatus = "partialcanceled";
  assert.equal(events.paymentEventsForDocument("orders", doc).length, 1);
});
test("취소 금액·일시 누락과 서버 처리 시각 대체를 사용하지 않는다", () => {
  for (const patch of [{ cancelAmount: null }, { canceledAt: null }, { source: "admin_cancel_approve", lastSyncedAt: canceledAt }]) {
    const doc = canceled();
    Object.assign(doc.paymentInfo.niceSync, patch);
    assert.equal(events.paymentEventsForDocument("orders", doc).length, 1);
  }
  assert.equal(events.paymentEventDate("2026-11-14"), null);
  assert.equal(events.paymentEventsForDocument("orders", { createdAt: paidAt, paymentStatus: "결제취소", totalPrice: 35000 }).length, 0);
});
test("연결 신청서를 중복 집계하지 않고 대여 보증금을 분리한다", () => {
  assert.equal(events.paymentEventsForDocument("applications", { ...canceled(), orderId: "linked" }).length, 0);
  assert.equal(events.paymentEventsForDocument("applications", { ...canceled(), rentalId: "linked" }).length, 0);
  const rental = { ...canceled(), amount: { total: 35000, deposit: 20000 } };
  const rows = events.paymentEventsForDocument("rentals", rental);
  assert.equal(rows[0].amount, 15000);
  assert.equal(rows[0].deposit, 20000);
  assert.equal(rows[1].amount, 15000);
});
test("전월 결제와 다음 달 취소를 KST 기간별로 분리한다", async () => {
  const db = { collection: (name) => ({ find: () => ({ toArray: async () => name === "orders" ? [canceled()] : [] }) }) };
  const october = await events.buildOnlinePaymentEvents(db, new Date("2026-10-01T00:00:00+09:00"), new Date("2026-11-01T00:00:00+09:00"));
  const november = await events.buildOnlinePaymentEvents(db, new Date("2026-11-01T00:00:00+09:00"), new Date("2026-12-01T00:00:00+09:00"));
  assert.equal(october.totals.paid, 35000);
  assert.equal(october.totals.refund, 0);
  assert.equal(november.totals.paid, 0);
  assert.equal(november.totals.refund, 35000);
  assert.equal(november.totals.net, -35000);
  const sameMonth = canceled();
  sameMonth.paymentInfo.approvedAt = new Date("2026-11-14T11:00:00+09:00");
  const sameDb = { collection: (name) => ({ find: () => ({ toArray: async () => name === "orders" ? [sameMonth] : [] }) }) };
  const total = await events.buildOnlinePaymentEvents(sameDb, new Date("2026-11-01T00:00:00+09:00"), new Date("2026-12-01T00:00:00+09:00"));
  assert.equal(total.totals.paid, 35000);
  assert.equal(total.totals.refund, 35000);
  assert.equal(total.totals.net, 0);
});
test("개인결제 이벤트와 오프라인 패키지 제외 필터를 유지한다", async () => {
  const rows = events.paymentEventsForDocument("privatePayments", { paidAt, canceledAt, amount: 35000 });
  assert.equal(rows.length, 2);
  let packageFilter;
  const db = { collection: (name) => ({ find: (filter) => { if (name === "packageOrders") packageFilter = filter; return { toArray: async () => [] }; } }) };
  await events.buildOnlinePaymentEvents(db, paidAt, new Date(canceledAt));
  assert.match(JSON.stringify(packageFilter), /offline_admin/);
  assert.doesNotMatch(read("app/api/settlements/_lib/paymentEvents.ts"), /collection\("offline/);
});

const approval = "2026-11-14T09:06:23.000+0900";
const cancellation = "2026-11-14T11:17:24.000+0900";
const expected = { tid: "synthetic-original", orderId: "synthetic-merchant-order", amount: 35000 };
const legacyOrder = () => ({ _id: new ObjectId(), orderId: expected.orderId, status: "취소", paymentStatus: "결제취소", totalPrice: 35000,
  paymentInfo: { provider: "nicepay", tid: expected.tid, total: 35000, approvedAt: approval, status: "canceled",
    niceSync: { source: "manual_sync_api", pgStatus: "cancelled", canceledAt: cancellation, cancelAmount: 0 } } });
function rawHistory(rows = [{ tid: "synthetic-cancel", amount: 35000, cancelledAt: cancellation }], balance = 0) {
  const raw = { resultCode: "0000", tid: expected.tid, orderId: expected.orderId, amount: "35000", status: balance ? "partialCancelled" : "cancelled", balanceAmt: String(balance), cancels: "[array]" };
  rows.forEach((row, index) => { raw[`cancels.${index}`] = "[object]"; for (const [key, value] of Object.entries(row)) raw[`cancels.${index}.${key}`] = String(value); });
  return raw;
}
function withEvidence(doc, raw = rawHistory()) {
  const result = cancellations.normalizeNiceCancelHistory(raw, expected);
  doc.paymentInfo.niceSync = { ...doc.paymentInfo.niceSync, pgStatus: raw.status, cancelHistory: result.history, cancelAmount: result.cancelAmount, canceledAt: result.canceledAt };
  return doc;
}

test("NICEPAY +0900 승인·취소 시각과 Z·콜론 오프셋·MongoDB Date를 처리한다", () => {
  for (const value of [approval, "2026-11-14T09:06:23.000+09:00", "2026-11-14T00:06:23.000Z", new Date("2026-11-14T00:06:23.000Z")]) {
    assert.equal(events.paymentEventDate(value).toISOString(), "2026-11-14T00:06:23.000Z");
  }
  assert.equal(events.paymentEventDate(cancellation).toISOString(), "2026-11-14T02:17:24.000Z");
  for (const value of ["2026-02-30T00:00:00Z", "2026-11-14T24:00:00+0900", "2026-11-14T09:06:23", "2026-11-14", "2026-11-14T00:00:00+2400", new Date(NaN)]) assert.equal(events.paymentEventDate(value), null);
});
test("기존 cancelAmount 0은 승인만 집계하며 원금으로 환불을 추정하지 않는다", () => {
  const rows = events.paymentEventsForDocument("orders", legacyOrder());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "paid");
  assert.equal(rows[0].amount, 35000);
});
test("검증된 단일 전체 취소만 35000원 환불 이벤트로 사용한다", () => {
  const doc = withEvidence(legacyOrder());
  const rows = events.paymentEventsForDocument("orders", doc);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].amount, 35000);
  assert.equal(rows[1].at.toISOString(), "2026-11-14T02:17:24.000Z");
  assert.doesNotMatch(JSON.stringify(doc.paymentInfo.niceSync.cancelHistory), /synthetic-original|synthetic-cancel/);
});
test("여러 부분 취소와 동일 내역 중복은 거래키로 중복 없이 정규화한다", () => {
  const first = { tid: "partial-1", amount: 10000, cancelledAt: "2026-11-30T23:59:59.000+0900" };
  const second = { tid: "partial-2", amount: 25000, cancelledAt: "2026-12-01T00:00:00.000+0900" };
  const partial = cancellations.normalizeNiceCancelHistory(rawHistory([first], 25000), expected);
  assert.equal(partial.history.events.length, 1);
  assert.equal(partial.history.balanceAmount, 25000);
  const raw = rawHistory([first, second, first]);
  const full = cancellations.normalizeNiceCancelHistory(raw, expected);
  assert.equal(full.history.verified, true);
  assert.equal(full.history.events.length, 2);
  assert.equal(full.cancelAmount, 25000, "기존 scalar는 누적액이 아닌 마지막 취소액");
  assert.deepEqual(full, cancellations.normalizeNiceCancelHistory(raw, expected));
  const rows = events.paymentEventsForDocument("orders", withEvidence(legacyOrder(), raw));
  assert.equal(rows.filter((row) => row.kind === "refund").reduce((sum, row) => sum + row.amount, 0), 35000);
});
for (const patch of [{ tid: "wrong" }, { orderId: "wrong" }, { amount: "34000" }, { balanceAmt: "1" }, { balanceAmt: "" }]) {
  test(`식별자·원금·잔액 모순은 동기화 근거를 거부한다: ${JSON.stringify(patch)}`, () => {
    assert.throws(() => cancellations.normalizeNiceCancelHistory({ ...rawHistory(), ...patch }, expected));
  });
}
for (const rows of [[], [{ tid: "x", cancelledAt: cancellation }], [{ tid: "x", amount: 35000 }], [{ tid: "x", amount: 35000, cancelledAt: "invalid" }], [{ tid: "x", amount: 35000, cancelledAt: cancellation }, {}], [{ tid: "x", amount: 10000, cancelledAt: cancellation }, { tid: "x", amount: 35000, cancelledAt: cancellation }]]) {
  test(`불완전 취소 내역은 0원이나 원금으로 보완하지 않는다: ${JSON.stringify(rows)}`, () => {
    const result = cancellations.normalizeNiceCancelHistory(rawHistory(rows), expected);
    assert.equal(result.history.verified, false);
    assert.equal(result.cancelAmount, null);
    assert.equal(result.history.events.length, 0);
    const doc = withEvidence(legacyOrder(), rawHistory(rows));
    doc.paymentInfo.niceSync.cancelAmount = 35000;
    assert.equal(events.paymentEventsForDocument("orders", doc).filter((row) => row.kind === "refund").length, 0);
  });
}

// 아래는 생성된 MongoDB 조회/갱신 표현식의 합성 실행기다. 실제 MongoDB 검증이 아니다.
const pathValue = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);
function expression(value, doc, vars = {}) {
  if (typeof value === "string") {
    if (value.startsWith("$$")) return pathValue(vars, value.slice(2));
    return value.startsWith("$") ? pathValue(doc, value.slice(1)) : value;
  }
  if (value == null || typeof value !== "object" || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => expression(item, doc, vars));
  const run = (item) => expression(item, doc, vars);
  if ("$literal" in value) return value.$literal;
  if ("$let" in value) return expression(value.$let.in, doc, { ...vars, ...Object.fromEntries(Object.entries(value.$let.vars).map(([key, item]) => [key, run(item)])) });
  if ("$type" in value) { const result = run(value.$type); return result instanceof Date ? "date" : result == null ? "missing" : Array.isArray(result) ? "array" : typeof result; }
  if ("$switch" in value) { const branch = value.$switch.branches.find((item) => run(item.case)); return run(branch ? branch.then : value.$switch.default); }
  if ("$cond" in value) return run(value.$cond[run(value.$cond[0]) ? 1 : 2]);
  if ("$regexMatch" in value) return value.$regexMatch.regex.test(run(value.$regexMatch.input));
  if ("$strLenBytes" in value) return run(value.$strLenBytes).length;
  if ("$subtract" in value) return run(value.$subtract[0]) - run(value.$subtract[1]);
  if ("$substrBytes" in value) return run(value.$substrBytes[0]).slice(run(value.$substrBytes[1]), run(value.$substrBytes[1]) + run(value.$substrBytes[2]));
  if ("$concat" in value) return value.$concat.map(run).join("");
  if ("$convert" in value) { const input = run(value.$convert.input); if (input == null) return value.$convert.onNull; if (typeof input === "string") assert.doesNotMatch(input, /[+-]\d{4}$/, "DB 변환 전에 오프셋을 정규화해야 합니다"); return events.paymentEventDate(input) ?? value.$convert.onError; }
  if ("$and" in value) return value.$and.every(run);
  if ("$or" in value) return value.$or.some(run);
  if ("$eq" in value) return run(value.$eq[0]) === run(value.$eq[1]);
  if ("$gte" in value) { const left = run(value.$gte[0]); return left != null && left >= run(value.$gte[1]); }
  if ("$lt" in value) { const left = run(value.$lt[0]); return left != null && left < run(value.$lt[1]); }
  if ("$isArray" in value) return Array.isArray(run(value.$isArray));
  if ("$map" in value) return run(value.$map.input).map((item) => expression(value.$map.in, doc, { ...vars, [value.$map.as]: item }));
  if ("$anyElementTrue" in value) return run(value.$anyElementTrue[0]).some(Boolean);
  if ("$mergeObjects" in value) return Object.assign({}, ...value.$mergeObjects.map(run));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, run(item)]));
}
function queryDatabase(orders) {
  return { collection: (name) => ({ find: (filter) => ({ toArray: async () => name === "orders" ? orders.filter((doc) => expression(filter.$and[0].$expr, doc)) : [] }) }) };
}
const range = (from, to) => [new Date(`${from}T00:00:00+09:00`), new Date(`${to}T00:00:00+09:00`)];
test("+0900 데이터가 Mongo 조회 표현식에서 제외되지 않고 같은 KST 날짜에 결제·환불로 잡힌다", async () => {
  const result = await events.buildOnlinePaymentEvents(queryDatabase([withEvidence(legacyOrder())]), ...range("2026-11-14", "2026-11-15"));
  assert.equal(result.totals.paid, 35000);
  assert.equal(result.totals.refund, 35000);
  assert.equal(result.totals.net, 0);
  const before = await events.buildOnlinePaymentEvents(queryDatabase([withEvidence(legacyOrder())]), ...range("2026-11-13", "2026-11-14"));
  assert.equal(before.events.length, 0);
});
test("승인월·최종 취소월 밖의 중간 취소도 cancels 이벤트 날짜로 조회한다", async () => {
  const doc = legacyOrder(); doc.paymentInfo.approvedAt = "2026-10-31T23:59:59.000+0900";
  const raw = rawHistory([{ tid: "november", amount: 10000, cancelledAt: "2026-11-14T11:17:24.000+0900" }, { tid: "december", amount: 25000, cancelledAt: "2026-12-01T00:00:00.000+0900" }]);
  withEvidence(doc, raw);
  const october = await events.buildOnlinePaymentEvents(queryDatabase([doc]), ...range("2026-10-01", "2026-11-01"));
  const november = await events.buildOnlinePaymentEvents(queryDatabase([doc]), ...range("2026-11-01", "2026-12-01"));
  const december = await events.buildOnlinePaymentEvents(queryDatabase([doc]), ...range("2026-12-01", "2027-01-01"));
  assert.equal(october.totals.paid, 35000); assert.equal(october.totals.refund, 0);
  assert.equal(november.totals.paid, 0); assert.equal(november.totals.refund, 10000);
  assert.equal(december.totals.refund, 25000);
});
test("부모 주문에 포함된 신청서는 검증된 취소 내역이 있어도 별도 매출로 집계하지 않는다", () => {
  const doc = withEvidence(legacyOrder()); doc.orderId = "parent";
  assert.equal(events.paymentEventsForDocument("applications", doc).length, 0);
});

const guard = load("lib/payments/nice/order-write-guard.ts", {
  "@/lib/status/flow-status": load("lib/status/flow-status.ts"),
  "@/lib/orders/cancel-finalization": load("lib/orders/cancel-finalization.ts"),
});
function syncFixture(raw = rawHistory()) {
  const doc = legacyOrder();
  const calls = { lookups: 0, writes: 0, logs: [] };
  const db = { collection: (name) => { assert.equal(name, "orders"); return {
    findOne: async () => doc,
    updateOne: async (filter, pipeline) => {
      if (filter.$expr && !expression(filter.$expr, doc)) return { matchedCount: 0, modifiedCount: 0 };
      for (const stage of pipeline) Object.assign(doc, expression(stage.$set, doc));
      calls.writes++;
      return { matchedCount: 1, modifiedCount: 1 };
    },
  }; } };
  const sync = load("lib/payments/nice/syncOrder.ts", {
    mongodb: { ObjectId }, "next/server": { NextResponse: Response },
    "@/lib/mongodb": { default: Promise.resolve({ db: () => db }) },
    "@/lib/payments/nice/order-write-guard": guard,
    "@/lib/payments/nice/cancel-events": cancellations,
    "@/lib/payments/nice/server": { getNicePaymentByTid: async () => { calls.lookups++; return raw; }, extractNiceCardInfo: () => null, summarizeNiceCardRaw: () => ({ topLevelKeys: [], presentCandidateKeys: [] }) },
  }, { process: { env: { NICEPAY_CLIENT_KEY: "synthetic", NICEPAY_SECRET_KEY: "synthetic" } }, console: { info: (...args) => calls.logs.push(args), error: (...args) => calls.logs.push(args) } });
  return { doc, calls, run: () => sync.syncNicePaymentByOrderId(String(doc._id)) };
}
test("취소 주문 재동기화는 조회만 하며 상태 유지·검증 내역 저장·중복 방지를 지킨다", async () => {
  const fixture = syncFixture();
  assert.equal((await fixture.run()).status, 200);
  const history = JSON.stringify(fixture.doc.paymentInfo.niceSync.cancelHistory);
  assert.equal(fixture.doc.status, "취소");
  assert.equal(fixture.doc.paymentStatus, "결제취소");
  assert.equal(fixture.doc.paymentInfo.niceSync.cancelAmount, 35000);
  assert.equal((await fixture.run()).status, 200);
  assert.equal(JSON.stringify(fixture.doc.paymentInfo.niceSync.cancelHistory), history);
  assert.equal(fixture.calls.lookups, 2);
  assert.equal(fixture.calls.writes, 2);
  assert.doesNotMatch(JSON.stringify(fixture.calls.logs), /synthetic-original|synthetic-cancel/);
});
test("조회 거래가 다르면 저장하지 않고 기존 취소 상태를 유지한다", async () => {
  const fixture = syncFixture({ ...rawHistory(), tid: "other-transaction" });
  assert.equal((await fixture.run()).status, 502);
  assert.equal(fixture.calls.writes, 0);
  assert.equal(fixture.doc.paymentInfo.niceSync.cancelAmount, 0);
});
test("취소 내역 없는 조회는 원금 환불이나 0원 확정 없이 확인 필요로 저장한다", async () => {
  const raw = rawHistory(); for (const key of Object.keys(raw)) if (key.startsWith("cancels")) delete raw[key];
  const fixture = syncFixture(raw);
  assert.equal((await fixture.run()).status, 200);
  assert.equal(fixture.doc.paymentInfo.niceSync.cancelAmount, null);
  assert.equal(fixture.doc.paymentInfo.niceSync.cancelHistory.verified, false);
  assert.equal(fixture.doc.paymentInfo.niceSync.cancelHistory.events.length, 0);
});
test("동기화 필터는 취소 주문을 paid 응답으로 되돌리지 않는다", async () => {
  const fixture = syncFixture({ ...rawHistory([]), status: "paid", balanceAmt: "35000" });
  assert.equal((await fixture.run()).status, 409);
  assert.equal(fixture.doc.status, "취소");
  assert.equal(fixture.doc.paymentStatus, "결제취소");
  assert.equal(fixture.calls.writes, 0);
});

test("명시적 시간대 없는 값은 Mongo 조회 조건과 최종 집계 양쪽에서 제외한다", async () => {
  const doc = legacyOrder();
  doc.paymentInfo.approvedAt = "2026-11-14T09:06:23";
  doc.paymentInfo.niceSync.canceledAt = "2026-11-14T11:17:24";
  doc.paymentInfo.niceSync.cancelAmount = 35000;
  const result = await events.buildOnlinePaymentEvents(queryDatabase([doc]), ...range("2026-11-14", "2026-11-15"));
  assert.equal(result.events.length, 0);
});
test("정산 live와 매출 리포트의 공개 금액 응답 계약을 유지한다", async () => {
  const db = queryDatabase([withEvidence(legacyOrder())]);
  const live = load("app/api/settlements/live/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/admin.guard": { requireAdmin: async () => ({ ok: true, db, admin: { _id: "synthetic-admin" } }) },
    "@/app/api/settlements/_lib/paymentEvents": events,
    "@/lib/admin/adminRateLimit": { enforceAdminRateLimit: async () => null },
    "@/lib/admin/adminEndpointCostPolicy": { ADMIN_EXPENSIVE_ENDPOINT_POLICIES: { settlementsRead: {} } },
    "@/app/api/settlements/_lib/offlineReference": { buildOfflineSettlementReference: async () => ({}) },
  });
  const response = await live.GET(new Request("https://synthetic.invalid/api/settlements/live?from=2026-11-14&to=2026-11-14"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.totals, { paid: 35000, refund: 35000, net: 0, rentalDeposit: 0 });
  assert.deepEqual(Object.keys(body).sort(), ["accountingBasis", "breakdown", "notice", "offline", "range", "totals"]);
  const report = load("app/api/admin/reports/revenue/_lib/buildRevenueReport.ts", {
    "@/app/api/settlements/_lib/paymentEvents": events,
    "@/app/api/admin/offline/_lib/revenueSummary": { buildOfflineRevenueSummary: async () => ({ total: { paidAmount: 0, refundedAmount: 0, pendingAmount: 0, netAmount: 0, byMethod: {} }, records: { paidAmount: 0 }, packageSales: { paidAmount: 0 }, daily: [] }) },
  });
  const result = await report.buildRevenueReport(db, { from: "2026-11-14", to: "2026-11-14", groupBy: "day" });
  assert.deepEqual(Object.keys(result).sort(), ["combinedPreview", "offline", "online", "range", "series"]);
  assert.equal(result.online.paidAmount, 35000);
  assert.equal(result.online.refundedAmount, 35000);
  assert.equal(result.online.netAmount, 0);
  assert.equal(result.series[0].date, "2026-11-14");
  assert.equal(result.series[0].onlineRefundAmount, 35000);
});
