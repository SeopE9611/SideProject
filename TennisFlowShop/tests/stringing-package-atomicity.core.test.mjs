import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Socket } from "node:net";
import vm from "node:vm";
import ts from "typescript";
import { ObjectId } from "mongodb";
import { z } from "zod";

// This is an optimistic, synthetic transaction model, NOT a MongoDB test.
// Every TS import is explicit; unknown dependencies and live I/O fail closed.
let liveAttempts = 0;
const blockLive = () => { liveAttempts++; throw new Error("LIVE_IO_FORBIDDEN"); };
test.mock.method(globalThis, "fetch", blockLive);
test.mock.method(Socket.prototype, "connect", blockLive);
test.after(() => assert.equal(liveAttempts, 0));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function load(path, stubs = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${outputText}\n})`, {
    Response, Request, URL, Date, console: { error() {}, warn() {}, log() {} },
    process: { env: { NICEPAY_CLIENT_KEY: "synthetic", NICEPAY_SECRET_KEY: "synthetic" } },
  })((id) => {
    assert.ok(Object.hasOwn(stubs, id), `unstubbed dependency: ${id}`);
    return stubs[id];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const clone = (v) => v instanceof ObjectId ? new ObjectId(v.toHexString())
  : v instanceof Date ? new Date(v) : Array.isArray(v) ? v.map(clone)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const get = (o, p) => p.split(".").reduce((v, k) => Array.isArray(v) ? v.map((x) => x?.[k]) : v?.[k], o);
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((f) => matches(doc, f));
    if (key === "$and") return value.every((f) => matches(doc, f));
    const actual = get(doc, key);
    if (value && typeof value === "object" && Object.keys(value).some((k) => k.startsWith("$"))) {
      return Object.entries(value).every(([op, expected]) => {
        if (op === "$exists") return (actual !== undefined) === expected;
        if (op === "$gte") return actual >= expected;
        if (op === "$gt") return actual > expected;
        if (op === "$in") return expected.some((v) => equal(actual, v));
        if (op === "$nin") return expected.every((v) => !equal(actual, v));
        if (op === "$ne") return !equal(actual, expected);
        if (op === "$elemMatch") return actual?.some((v) => matches(v, expected));
        assert.fail(`unsupported filter ${op}`);
      });
    }
    return value === null ? actual == null : Array.isArray(actual) ? actual.some((v) => equal(v, value)) : equal(actual, value);
  });
}
function mutate(doc, path, value, kind, filter, options) {
  const parts = path.split(".");
  function visit(target, index) {
    const key = parts[index];
    if (key === "$" || key.startsWith("$[")) {
      const arrayName = parts[index - 1];
      const identifier = key.slice(2, -1);
      const candidateFilter = key === "$"
        ? filter[arrayName]?.$elemMatch ?? { applicationId: filter[`${arrayName}.applicationId`] }
        : Object.fromEntries((options.arrayFilters ?? []).flatMap((f) => Object.entries(f))
          .filter(([k]) => k.startsWith(`${identifier}.`)).map(([k, v]) => [k.slice(identifier.length + 1), v]));
      const elements = target.filter((item) => matches(item, candidateFilter));
      for (const item of key === "$" ? elements.slice(0, 1) : elements) visit(item, index + 1);
      return;
    }
    if (index < parts.length - 1) { target[key] ??= {}; visit(target[key], index + 1); return; }
    if (kind === "$inc") target[key] = (target[key] ?? 0) + value;
    else if (kind === "$push") { target[key] ??= []; target[key].push(...clone(value.$each ?? [value])); }
    else if (kind === "$unset") delete target[key];
    else target[key] = clone(value);
  }
  visit(doc, 0);
}
function model(seed) {
  const m = { data: clone(seed), version: 0, retries: 0, commits: 0, rollbacks: 0, effects: 0, pg: 0, slots: [], fail: null, hook: null };
  const table = (name, options) => (options?.session?.local ?? m.data)[name] ??= [];
  const collection = (name) => ({
    async findOne(filter, options) {
      await m.hook?.({ name, filter, read: true, options });
      return clone(table(name, options).find((d) => matches(d, filter)) ?? null);
    },
    find(filter, options) {
      const cursor = { sort() { return cursor; }, limit() { return cursor; },
        async next() { return clone(table(name, options).find((d) => matches(d, filter)) ?? null); },
        async toArray() { return clone(table(name, options).filter((d) => matches(d, filter))); } };
      return cursor;
    },
    async insertOne(doc, options) {
      if (name === "service_pass_consumptions" && table(name, options).some((d) => equal(d.passId, doc.passId) && equal(d.applicationId, doc.applicationId))) {
        throw Object.assign(new Error("duplicate consumption"), { code: 11000 });
      }
      table(name, options).push(clone(doc));
      if (!options?.session) m.version++;
      return { insertedId: doc._id, acknowledged: true };
    },
    async deleteOne(filter, options) {
      const docs = table(name, options), i = docs.findIndex((d) => matches(d, filter));
      if (i >= 0) docs.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    },
    async updateOne(filter, update, options = {}) {
      assert.ok(arguments.length <= 3, "MongoDB updateOne accepts one options argument");
      await m.hook?.({ name, filter, update, options });
      if (m.fail?.(name, update)) throw new Error("SYNTHETIC_WRITE_FAILURE");
      const docs = table(name, options);
      let doc = docs.find((d) => matches(d, filter));
      const existed = !!doc;
      if (!doc && options.upsert) { doc = { _id: filter._id }; docs.push(doc); }
      if (!doc) return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
      for (const [kind, fields] of Object.entries(update)) {
        if (kind === "$setOnInsert" && existed) continue;
        for (const [path, value] of Object.entries(fields)) mutate(doc, path, value, kind, filter, options);
      }
      if (!options.session) m.version++;
      return { matchedCount: existed ? 1 : 0, modifiedCount: 1, acknowledged: true };
    },
    async findOneAndUpdate(filter, update, options) {
      const result = await collection(name).updateOne(filter, update, options);
      return result.matchedCount ? collection(name).findOne({ _id: filter._id }, options) : null;
    },
  });
  const client = { startSession() {
    const session = { local: null, inTransaction() { return session.local !== null; },
      async withTransaction(fn) {
        assert.equal(session.inTransaction(), false, "no nested transaction");
        for (let attempt = 0; attempt < 5; attempt++) {
          const version = m.version; session.local = clone(m.data);
          try {
            const result = await fn();
            if (version !== m.version) { m.retries++; continue; }
            m.data = session.local; m.version++; m.commits++;
            return result;
          } catch (error) { m.rollbacks++; throw error; }
          finally { session.local = null; }
        }
        throw new Error("SYNTHETIC_RETRY_EXHAUSTED");
      }, async endSession() { assert.equal(session.local, null); } };
    (m.sessions ??= []).push(session);
    return session;
  } };
  m.db = { client, collection }; client.db = () => m.db;
  return m;
}
const userId = new ObjectId("507f1f77bcf86cd799439001");
const passId = new ObjectId("507f1f77bcf86cd799439002");
const appId = new ObjectId("507f1f77bcf86cd799439003");
const orderId = new ObjectId("507f1f77bcf86cd799439004");
const productId = new ObjectId("507f1f77bcf86cd799439005");
const requestedId = new ObjectId("507f1f77bcf86cd799439006");
function seed(consumed = true) {
  return {
    users: [{ _id: userId, role: "admin" }],
    service_passes: [{ _id: passId, userId, orderId, status: "active", usedCount: consumed ? 1 : 0,
      remainingCount: consumed ? 2 : 3, expiresAt: new Date("2099-01-01"), redemptions: consumed ? [{ applicationId: appId }] : [] }],
    service_pass_consumptions: consumed ? [{ _id: new ObjectId(), passId, applicationId: appId, count: 1 }] : [],
    packageOrders: [{ _id: orderId, paymentStatus: "결제완료" }],
    orders: [{ _id: orderId, userId, status: "결제완료", items: [] }],
    stringing_applications: [{ _id: appId, userId, status: consumed ? "검토 중" : "draft", cancelRequest: { status: consumed ? "requested" : "none" },
      packageApplied: consumed, packagePassId: consumed ? passId : null, paymentStatus: "결제완료", paymentInfo: { provider: "bank_transfer" },
      stringDetails: { stringTypes: [String(productId)] }, meta: { selectedGauge: "1.25", gaugeStockDeductedAt: new Date(0), unrelated: "keep" } }],
    products: [{ _id: productId, sold: 5, inventory: { stock: 10 }, gaugeInventories: [{ value: "1.25", stock: 10 }],
      colorInventories: [{ value: "red", stock: 10 }], variantInventories: [{ colorValue: "red", gaugeValue: "1.25", stock: 10 }] }],
  };
}
const passes = load("lib/passes.service.ts", { mongodb: { ObjectId }, "@/lib/pass-status": load("lib/pass-status.ts") });
function stubImports(path, overrides) {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.ES2022, true);
  const stubs = {};
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) stubs[statement.moduleSpecifier.text] = new Proxy({}, {
      get: (_, key) => () => { throw new Error(`unused dependency called: ${statement.moduleSpecifier.text}.${String(key)}`); },
    });
  }
  return { ...stubs, ...overrides };
}
function handlers(m) {
  const path = "app/features/stringing-applications/api/handlers.ts";
  return load(path, stubImports(path, {
    mongodb: { ObjectId }, "next/server": { NextResponse: Response },
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic" }) }) },
    "@/lib/mongodb": { getDb: async () => m.db, default: Promise.resolve(m.db.client) },
    "@/lib/auth.utils": { verifyAccessToken: () => ({ sub: String(userId), role: "admin" }) },
    "@/lib/admin/portfolio-demo-readonly.server": { getPortfolioDemoAdminMutationBlock: () => null },
    "@/lib/status/flow-status": load("lib/status/flow-status.ts"),
    "@/lib/passes.service": passes,
    "node:crypto": { randomUUID: () => "synthetic-cancel-token" },
    "@/lib/payments/toss/session": { tossPaymentSessions: (db) => db.collection("toss_payment_sessions") },
    "@/lib/admin/appendAdminAudit": { appendAdminAudit: async () => { m.effects++; } },
    "@/lib/risk/recordCancelRefundSignal": { buildCancelRefundSubject: () => ({}), recordCancelRefundSignal: async () => { m.effects++; } },
    "@/lib/payments/nice/server": {
      getNicePaymentByTid: async ({ tid }) => {
        assert.equal(tid, "synthetic-tid");
        return { resultCode: "0000", status: "paid", tid, orderId: "synthetic-order", amount: "10000", balanceAmt: "10000" };
      },
      cancelNicePaymentByTid: async ({ tid, orderId }) => {
        assert.equal(tid, "synthetic-tid"); assert.equal(orderId, "synthetic-order");
        assert.equal(m.sessions?.some((session) => session.inTransaction()) ?? false, false);
        assert.equal(m.data.stringing_applications[0].cancelRequest.pgCancelClaim.status, "processing");
        assert.ok(m.data.stringing_applications[0].cancelRequest.pgCancelClaim.postAttemptedAt);
        m.pg++;
        return { resultCode: "0000", status: "canceled", tid: "synthetic-tid", balanceAmt: "0" };
      },
    },
  }));
}
function submit(m) {
  const path = "app/features/stringing-applications/api/submit-core.ts";
  return load(path, stubImports(path, {
    mongodb: { ObjectId },
    "@/app/features/stringing-applications/lib/collection": { normalizeCollection: (v) => v },
    "@/app/features/stringing-applications/lib/package-pricing": load("app/features/stringing-applications/lib/package-pricing.ts"),
    "@/app/features/stringing-applications/lib/slotEngine": { loadStringingSettings: async () => ({}), resolveDaySchedule: () => ({ interval: 30 }) },
    "@/app/features/stringing-applications/lib/visitReservationGuard": { guardVisitReservation: async (p) => { assert.ok(p.session.inTransaction()); m.slots.push(p); } },
    "@/lib/passes.service": passes,
    "@/lib/pricing": { calcStringingTotal: async () => 10000, calcStringingMountingFeeByProductId: async () => 10000 },
    "@/lib/portfolio-demo/interactive.server": { shouldPreservePortfolioDemoInventory: () => false },
    "@/lib/claims": { normalizeEmail: (v) => v ?? "" },
    "@/lib/search-email": { normalizeEmailForSearch: (v) => v ?? "" },
    "@/lib/public-visibility": { productVisibilityFilterFor: () => ({}) },
    "@/lib/public-visibility-viewer": { getVisibilityViewerFromCookies: async () => ({}) },
  })).submitStringingApplicationCore;
}
const request = (body = {}) => new Request("https://synthetic.invalid/cancel", { method: "POST", body: JSON.stringify(body) });
const context = { params: { id: String(appId) } };
const input = { applicationId: String(appId), name: "synthetic", phone: "000", stringTypes: ["custom"] };

test("consume then revert once, including legacy missing reverted and active caller session", async () => {
  const m = model(seed(false));
  const session = m.db.client.startSession();
  await session.withTransaction(async () => {
    await passes.consumePass(m.db, passId, appId, 1, { session });
    await passes.revertConsumption(m.db, passId, appId, { session });
  });
  assert.equal(m.commits, 1);
  assert.equal(m.data.service_passes[0].remainingCount, 3);
  assert.equal(m.data.service_passes[0].usedCount, 0);
  assert.equal(m.data.service_passes[0].redemptions[0].reverted, true);
});
test("repeated and simultaneous restoration increments only once", async () => {
  const m = model(seed()); m.data.service_pass_consumptions[0].reverted = false;
  await Promise.all([passes.revertConsumption(m.db, passId, appId), passes.revertConsumption(m.db, passId, appId)]);
  await passes.revertConsumption(m.db, passId, appId);
  assert.equal(m.data.service_passes[0].remainingCount, 3);
  assert.equal(m.data.service_passes[0].usedCount, 0);
  assert.ok(m.retries > 0);
});
for (const mismatch of ["write failure", "missing redemption", "insufficient used count"]) {
  test(`restore rolls back log on ${mismatch}`, async () => {
    const m = model(seed());
    if (mismatch === "write failure") m.fail = (name) => name === "service_passes";
    if (mismatch === "missing redemption") m.data.service_passes[0].redemptions = [];
    if (mismatch === "insufficient used count") m.data.service_passes[0].usedCount = 0;
    const before = clone(m.data);
    await assert.rejects(passes.revertConsumption(m.db, passId, appId));
    assert.deepEqual(m.data, before);
  });
}
test("insufficient balance consumes nothing in caller transaction", async () => {
  const m = model(seed(false)); m.data.service_passes[0].remainingCount = 0;
  const session = m.db.client.startSession(); const before = clone(m.data);
  await assert.rejects(session.withTransaction(() => passes.consumePass(m.db, passId, appId, 1, { session })));
  assert.deepEqual(m.data, before);
});
for (const name of ["handleStringingCancelApprove", "handleStringingAdminCancel", "handleApplicationCancelApprove", "handleUpdateApplicationStatus"]) {
  test(`${name}: resources, history and cancellation commit together`, async () => {
    const m = model(seed());
    const response = await handlers(m)[name](request({ reason: "synthetic", status: "취소" }), context);
    assert.equal(response.status, 200, await response.text());
    assert.equal(m.data.stringing_applications[0].status, "취소");
    assert.equal(m.data.products[0].inventory.stock, 11);
    assert.equal(m.data.service_passes[0].remainingCount, 3);
    assert.equal(m.data.stringing_applications[0].meta.unrelated, "keep");
    assert.equal(m.data.stringing_applications[0].history.length, 1);
    assert.equal(m.pg, 0);
  });
}
for (const failure of ["products", "service_passes", "final application"]) {
  test(`cancel rolls back everything and emits no success audit on ${failure} failure`, async () => {
    const m = model(seed()); const before = clone(m.data);
    m.fail = (name, update) => name === failure || (failure === "final application" && name === "stringing_applications" && !!update.$push);
    const response = await handlers(m).handleStringingCancelApprove(request(), context);
    assert.equal(response.status, 500);
    assert.deepEqual(m.data, before);
    assert.equal(m.effects, 0);
  });
}
test("restore matchedCount=0 aborts all cancellation writes", async () => {
  const m = model(seed()); m.data.products[0].sold = 0; const before = clone(m.data);
  assert.equal((await handlers(m).handleStringingCancelApprove(request(), context)).status, 409);
  assert.deepEqual(m.data, before); assert.equal(m.effects, 0);
});
test("request approval vs direct cancellation restores once", async () => {
  const m = model(seed()); const h = handlers(m);
  const responses = await Promise.all([h.handleStringingCancelApprove(request(), context), h.handleStringingAdminCancel(request({ reason: "synthetic" }), context)]);
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(m.data.products[0].inventory.stock, 11);
  assert.equal(m.data.service_passes[0].remainingCount, 3);
  assert.equal(m.data.stringing_applications[0].history.length, 1);
});
for (const field of ["orderId", "rentalId", "paymentSource"]) {
  test(`stale independent cancel rejects newly linked ${field}`, async () => {
    const m = model(seed()); let changed = false;
    m.hook = ({ name, update }) => {
      if (!changed && name === "stringing_applications" && update) {
        changed = true; m.data.stringing_applications[0][field] = field === "paymentSource" ? `order:${orderId}` : orderId; m.version++;
      }
    };
    assert.equal((await handlers(m).handleStringingCancelApprove(request(), context)).status, 409);
    assert.equal(m.data.products[0].inventory.stock, 10);
    assert.equal(m.data.service_passes[0].remainingCount, 2);
    assert.equal(m.effects, 0);
  });
}
for (const variant of [false, true]) {
  test(`color${variant ? "+variant" : " only"} restore preserves existing markers`, async () => {
    const m = model(seed()); const app = m.data.stringing_applications[0];
    app.meta.selectedColor = "red"; app.meta.colorStockDeductedAt = new Date(0);
    if (variant) app.stockDeduction = { mode: "variant", colorValue: "red", gaugeValue: "1.25" };
    else delete app.meta.gaugeStockDeductedAt;
    assert.equal((await handlers(m).handleStringingCancelApprove(request(), context)).status, 200);
    assert.equal(m.data.products[0].inventory.stock, 11);
    assert.equal(m.data.products[0].colorInventories[0].stock, 11);
    if (variant) {
      assert.equal(m.data.products[0].variantInventories[0].stock, 11);
      assert.ok(m.data.stringing_applications[0].stockRestore.variantStockRestoredAt);
    } else assert.ok(m.data.stringing_applications[0].meta.colorStockRestoredAt);
  });
}
for (const representation of ["ObjectId", "string"]) {
  test(`canonical draft ${representation} ID is used for consumption, persistence and visit exclusion`, async () => {
    const m = model(seed(false)); const app = m.data.stringing_applications[0];
    app.orderId = representation === "string" ? String(orderId) : orderId;
    m.data.stringing_applications.push({ ...clone(app), _id: requestedId });
    const result = await submit(m)({ db: m.db, userId, input: { ...input, applicationId: String(requestedId), orderId: String(orderId), shippingInfo: { collectionMethod: "visit" } } });
    assert.equal(String(result.applicationId), String(appId));
    assert.equal(String(m.data.service_pass_consumptions[0].applicationId), String(appId));
    assert.equal(String(m.slots[0].excludeApplicationId), String(appId));
    assert.equal(m.data.stringing_applications[0].status, "검토 중");
    assert.equal(m.data.service_passes[0].remainingCount, 2);
  });
}
test("non-visit submission storage failure rolls back consumption", async () => {
  const m = model(seed(false)); const before = clone(m.data);
  m.fail = (name, update) => name === "stringing_applications" && !!update.$set?.submittedAt;
  await assert.rejects(submit(m)({ db: m.db, userId, input }));
  assert.deepEqual(m.data, before);
});
test("concurrent submissions of one draft consume once and reject stale retry", async () => {
  const m = model(seed(false)); const core = submit(m);
  const results = await Promise.allSettled([core({ db: m.db, userId, input }), core({ db: m.db, userId, input })]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 409);
  assert.equal(m.data.service_pass_consumptions.length, 1);
  assert.equal(m.data.service_passes[0].remainingCount, 2);
});
test("explicit application cannot move to another parent", async () => {
  const m = model(seed(false)); m.data.stringing_applications[0].orderId = requestedId;
  await assert.rejects(submit(m)({ db: m.db, userId, input: { ...input, orderId: String(orderId) } }), (e) => e.status === 409);
  assert.equal(m.data.service_pass_consumptions.length, 0);
});
test("offline package use and revert routes retain caller-owned transactions and reject a second revert", async () => {
  const m = model(seed(false));
  m.data.offline_customers = [{ _id: productId, linkedUserId: userId }];
  m.data.offline_service_records = [{ _id: appId, offlineCustomerId: productId }];
  const shared = {
    mongodb: { ObjectId }, zod: { z }, "next/server": { NextResponse: Response },
    "@/lib/admin.guard": { requireAdmin: async () => ({ ok: true, db: m.db, admin: { _id: userId } }) },
    "@/lib/admin/verifyAdminCsrf": { verifyAdminCsrf: () => ({ ok: true }) },
    "@/lib/audit": { appendAudit: async () => { m.effects++; } },
    "@/lib/passes.service": passes, "@/lib/pass-status": load("lib/pass-status.ts"),
  };
  const usePath = "app/api/admin/offline/records/[id]/package/use/route.ts";
  const revertPath = "app/api/admin/offline/records/[id]/package/revert/route.ts";
  const use = load(usePath, stubImports(usePath, shared)).POST;
  const revert = load(revertPath, stubImports(revertPath, shared)).POST;
  const ctx = { params: Promise.resolve({ id: String(appId) }) };
  const used = await use(request({ passId: String(passId), usedCount: 1 }), ctx);
  assert.equal(used.status, 200, await used.text());
  assert.equal(m.data.service_passes[0].remainingCount, 2);
  const restored = await revert(request({ reason: "synthetic" }), ctx);
  assert.equal(restored.status, 200, await restored.text());
  assert.equal(m.data.service_passes[0].remainingCount, 3);
  assert.equal((await revert(request({ reason: "synthetic" }), ctx)).status, 409);
  assert.equal(m.data.service_passes[0].remainingCount, 3);
  assert.equal(m.effects, 2);
});
for (const representation of ["ObjectId", "string"]) {
  test(`existing order cancellation restores linked ${representation} application in its original transaction`, async () => {
    const m = model(seed());
    m.data.orders[0].paymentStatus = "결제완료";
    m.data.orders[0].paymentInfo = { provider: "bank_transfer" };
    m.data.orders[0].cancelRequest = { status: "requested" };
    m.data.stringing_applications[0].orderId = representation === "string" ? String(orderId) : orderId;
    const finalization = load("lib/orders/cancel-finalization.ts");
    const guard = load("lib/orders/cancel-write-guard.ts", {
      "@/lib/orders/cancel-finalization": finalization,
      "@/lib/status/flow-status": load("lib/status/flow-status.ts"),
    });
    const path = "app/api/orders/[id]/cancel-approve/route.ts";
    const route = load(path, stubImports(path, {
      mongodb: { ObjectId }, "next/server": { NextResponse: Response },
      "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic" }) }) },
      "@/lib/mongodb": { default: Promise.resolve(m.db.client) },
      "@/lib/auth.utils": { verifyAccessToken: () => ({ sub: String(userId), role: "admin" }) },
      "@/lib/admin/portfolio-demo-readonly.server": { getPortfolioDemoAdminMutationBlock: () => null },
      "@/lib/orders/cancel-write-guard": guard,
      "@/lib/orders/cancel-finalization": finalization,
      "@/lib/orders/cancel-refund-policy": load("lib/orders/cancel-refund-policy.ts"),
      "@/lib/passes.service": passes,
      "@/lib/admin/appendAdminAudit": { appendAdminAudit: async () => { m.effects++; } },
      "@/lib/risk/recordCancelRefundSignal": { buildCancelRefundSubject: () => ({}), recordCancelRefundSignal: async () => { m.effects++; } },
    }));
    const response = await route.POST(request(), { params: Promise.resolve({ id: String(orderId) }) });
    assert.equal(response.status, 200, await response.text());
    assert.equal(m.commits, 1);
    assert.equal(m.data.orders[0].status, "취소");
    assert.equal(m.data.stringing_applications[0].status, "취소");
    assert.equal(m.data.service_passes[0].remainingCount, 3);
    assert.equal(m.data.products[0].inventory.stock, 11);
  });
}
test("simultaneous approvals of one independent application restore once", async () => {
  const m = model(seed()); const h = handlers(m);
  const responses = await Promise.all([h.handleStringingCancelApprove(request(), context), h.handleStringingCancelApprove(request(), context)]);
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(m.data.products[0].inventory.stock, 11);
  assert.equal(m.data.service_passes[0].remainingCount, 3);
});
test("stale generic status change cannot overwrite a committed independent cancellation", async () => {
  const m = model(seed()); const h = handlers(m);
  let release, arrived;
  const paused = new Promise((resolve) => { arrived = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  m.hook = async ({ name, update }) => {
    if (name === "stringing_applications" && update?.$set?.status === "접수완료") { arrived(); await gate; }
  };
  const stale = h.handleUpdateApplicationStatus(request({ status: "접수완료" }), context);
  await paused;
  assert.equal((await h.handleStringingCancelApprove(request(), context)).status, 200);
  release();
  assert.equal((await stale).status, 409);
  assert.equal(m.data.stringing_applications[0].status, "취소");
  assert.equal(m.data.stringing_applications[0].history.length, 1);
});
test("order-linked non-visit product deduction rolls back when application persistence fails", async () => {
  const m = model(seed(false)); const app = m.data.stringing_applications[0];
  app.orderId = orderId; app.meta = {};
  const before = clone(m.data); let deducted = false;
  m.hook = ({ name, update }) => { if (name === "products" && update?.$inc?.["inventory.stock"] < 0) deducted = true; };
  m.fail = (name, update) => name === "stringing_applications" && !!update.$set?.submittedAt;
  await assert.rejects(submit(m)({ db: m.db, userId, input: { ...input, orderId: String(orderId), stringTypes: [String(productId)], selectedGauge: "1.25", selectedColor: "red" } }), /SYNTHETIC_WRITE_FAILURE/);
  assert.ok(deducted);
  assert.deepEqual(m.data, before);
});
test("already restored stock markers are preserved without increasing inventory", async () => {
  const m = model(seed()); m.data.stringing_applications[0].meta.gaugeStockRestoredAt = new Date(0);
  assert.equal((await handlers(m).handleStringingCancelApprove(request(), context)).status, 200);
  assert.equal(m.data.products[0].inventory.stock, 10);
  assert.equal(m.data.stringing_applications[0].meta.gaugeStockRestoredAt.getTime(), 0);
});
test("required stock metadata missing aborts instead of recording a successful cancellation", async () => {
  const m = model(seed()); delete m.data.stringing_applications[0].meta.selectedGauge;
  const before = clone(m.data);
  assert.equal((await handlers(m).handleStringingCancelApprove(request(), context)).status, 409);
  assert.deepEqual(m.data, before); assert.equal(m.effects, 0);
});
test("NICE cancellation still occurs outside a transaction, once before DB finalization", async () => {
  for (const failFinalization of [false, true]) {
    const m = model(seed()); const app = m.data.stringing_applications[0];
    app.servicePaid = true; app.totalPrice = 10000;
    app.packageApplied = false; app.packagePassId = null;
    app.paymentInfo = { provider: "nicepay", tid: "synthetic-tid", orderId: "synthetic-order" };
    m.data.toss_payment_sessions = [{
      provider: "nicepay", flowType: "stringing_application", status: "approved",
      niceOrderId: "synthetic-order", applicationId: String(appId), mongoOrderId: String(appId),
      paymentKey: "synthetic-tid", amount: 10000,
    }];
    let evidenceSaved = false;
    m.hook = ({ name, update, options }) => {
      if (name !== "stringing_applications" || !update) return;
      if (options.session) {
        assert.equal(options.session.inTransaction(), true);
        assert.equal(evidenceSaved, true);
        assert.equal(m.data.stringing_applications[0].cancelRequest.pgCancelClaim.status, "pg_canceled");
        assert.equal(m.pg, 1);
      } else if (update.$set?.["cancelRequest.pgCancelClaim.status"] === "pg_canceled") {
        assert.equal(m.pg, 1); assert.equal(m.commits, 0); evidenceSaved = true;
      } else {
        assert.equal(m.pg, 0);
        if (update.$set?.cancelRequest) assert.equal(update.$set.cancelRequest.pgCancelClaim.token, "synthetic-cancel-token");
      }
    };
    m.fail = (name, update) => failFinalization && name === "stringing_applications" && !!update.$push;
    const response = await handlers(m).handleStringingCancelApprove(request(), context);
    assert.equal(response.status, failFinalization ? 500 : 200);
    assert.equal(m.pg, 1); assert.equal(evidenceSaved, true);
    if (failFinalization) {
      assert.equal((await response.json()).errorCode, "NICE_CANCEL_FINALIZATION_PENDING");
      assert.equal(m.rollbacks, 1);
      assert.equal(m.data.stringing_applications[0].status, "검토 중");
      assert.equal(m.data.stringing_applications[0].paymentStatus, "결제취소");
      assert.equal(m.data.stringing_applications[0].cancelRequest.pgCancelClaim.status, "pg_canceled");
      m.fail = null;
      assert.equal((await handlers(m).handleStringingCancelApprove(request(), context)).status, 200);
      assert.equal(m.pg, 1, "finalization retry must reuse persisted PG evidence");
    }
  }
});
