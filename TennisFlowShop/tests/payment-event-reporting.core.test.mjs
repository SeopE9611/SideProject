import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// 기존 core 테스트와 동일하게 TS를 격리 로드한다. DB·PG 연결은 제공하지 않는다.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function load(path, dependencies = {}) {
  const compiledModule = { exports: {} };
  const { outputText } = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(`(function(require,module,exports){${outputText}\n})`, { Date })((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `미지정 의존성: ${id}`);
    return dependencies[id];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const policy = load("app/api/settlements/_lib/settlementPolicy.ts");
const events = load("app/api/settlements/_lib/paymentEvents.ts", {
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
