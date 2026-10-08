import assert from "node:assert/strict";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";
import { ObjectId } from "mongodb";

const id = "507f1f77bcf86cd799439011";
const paths = {
  order: "app/api/orders/[id]/cancel-approve/route.ts",
  rental: "app/api/admin/rentals/[id]/cancel-approve/route.ts",
  deposit: "app/api/admin/rentals/[id]/deposit/refund/route.ts",
};
const lookupError = (kind, resultCode = "") => Object.assign(new Error("mock lookup failure"), { provider: "nicepay", operation: "lookup", kind, resultCode });
const postError = (resultCode) => Object.assign(new Error("mock cancel failure"), { resultCode });

function fixture(t, route, scenario = {}) {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected live fetch in route fixture"); });
  for (const [key, value] of [["NICEPAY_CLIENT_KEY", "mock-client"], ["NICEPAY_SECRET_KEY", "mock-secret"]]) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const document = {
    _id: new ObjectId(id), orderId: "mock-order", status: route === "deposit" ? "returned" : "pending",
    paymentStatus: "결제완료", paymentInfo: { provider: "nicepay", tid: "mock-tid", total: 10000 },
    amount: { deposit: 5000 }, cancelRequest: { status: "requested" }, items: [],
  };
  const updates = [];
  const histories = [];
  const calls = { get: [], cancel: [], transactions: 0 };
  let dbFailureThrown = false;
  function setPath(path, value) {
    const parts = path.split(".");
    let target = document;
    for (const part of parts.slice(0, -1)) target = target[part] ??= {};
    target[parts.at(-1)] = value;
  }
  const primary = {
    findOne: async () => structuredClone(document),
    findOneAndUpdate: async (_filter, update) => {
      for (const [key, value] of Object.entries(update.$set)) setPath(key, value);
      return structuredClone(document);
    },
    updateOne: async (_filter, update) => {
      if (scenario.dbError && !dbFailureThrown && (update.$set?.paymentStatus === "결제취소" || update.$set?.["paymentInfo.depositRefund.status"] === "completed")) {
        dbFailureThrown = true;
        throw scenario.dbError;
      }
      updates.push(structuredClone(update));
      for (const [key, value] of Object.entries(update.$set ?? {})) setPath(key, value);
      if (update.$push?.history) histories.push(update.$push.history);
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
  const empty = {
    findOne: async () => null,
    find: () => ({ toArray: async () => [] }),
    updateOne: async () => ({ matchedCount: 1, modifiedCount: 1 }),
    insertOne: async (entry) => { histories.push(entry); return {}; },
  };
  const db = { collection: (name) => name === (route === "order" ? "orders" : "rental_orders") ? primary : empty };
  const client = {
    db: () => db,
    startSession: () => ({
      withTransaction: async (fn) => { calls.transactions++; await fn(); },
      endSession: async () => {},
    }),
  };
  const stubs = {
    "next/server": { NextResponse: Response },
    "mongodb": { ObjectId },
    "@/lib/mongodb": { default: Promise.resolve(client) },
    "@/lib/admin.guard": { requireAdmin: async () => ({ ok: true, db, admin: { _id: id } }) },
    "@/lib/admin/verifyAdminCsrf": { verifyAdminCsrf: () => ({ ok: true }) },
    "@/lib/admin/appendAdminAudit": { appendAdminAudit: async () => {} },
    "@/lib/auth.utils": { verifyAccessToken: () => ({ sub: id, role: "admin" }) },
    "next/headers": { cookies: async () => ({ get: (key) => key === "accessToken" ? { value: "mock-token" } : undefined }) },
    "jsonwebtoken": { default: {} },
    "@/lib/admin/portfolio-demo-readonly.server": { getPortfolioDemoAdminMutationBlock: () => null },
    "@/lib/orders/cancel-finalization": { isExternallyCanceledPayment: (doc) => doc.paymentStatus === "결제취소" && doc.paymentInfo?.status === "canceled" },
    "@/lib/orders/cancel-refund-policy": { isAdminCancelableOrderStatus: () => true, isAdminForceCancelRequired: () => false },
    "@/lib/passes.service": { revertConsumption: async () => {} },
    "@/lib/points.service": { grantPoints: async () => {}, deductPoints: async () => {} },
    "@/lib/risk/recordCancelRefundSignal": { buildCancelRefundSubject: () => ({}), recordCancelRefundSignal: async () => {} },
    "@/lib/payments/nice/server": {
      NICE_PAYMENT_CLAIM_LEASE_MS: 300000,
      getNicePaymentByTid: async (params) => {
        calls.get.push(params);
        if (calls.get.length === 1 && scenario.beforeError) throw scenario.beforeError;
        if (calls.get.length === 2 && scenario.afterError) throw scenario.afterError;
        return calls.get.length === 1 ? { resultCode: "0000", status: "paid", balanceAmt: "10000" } : { resultCode: "0000", status: "partialcanceled", balanceAmt: "5000" };
      },
      cancelNicePaymentByTid: async (params) => {
        calls.cancel.push(params);
        if (scenario.cancelError) throw scenario.cancelError;
        return { resultCode: scenario.cancelCode ?? "0000", resultMsg: "mock PG response", status: "canceled" };
      },
    },
  };
  const module = compileTsModule(paths[route], stubs);
  const run = async () => {
    const response = await module.POST(new Request("https://shop.invalid/api/admin/cancel", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id }) });
    return { response, body: await response.json() };
  };
  return { run, document, updates, histories, calls };
}

function assertNoShortage(f) {
  assert.equal(f.document.cancelRequest?.pgCancelBlocked, undefined);
  assert.equal(f.document.paymentInfo.niceSync?.manualActionReason, undefined);
  assert.notEqual(f.document.paymentInfo.depositRefund?.manualActionReason, "unsettled_amount_shortage");
  assert.equal(JSON.stringify(f.histories).includes("미정산"), false);
}

for (const route of Object.keys(paths)) {
  test(route + ": untagged pre-GET 2026 is not a cancel rejection", async (t) => {
    const f = fixture(t, route, { beforeError: postError("2026") });
    const { body } = await f.run();
    assert.notEqual(body.errorCode, "NICE_UNSETTLED_AMOUNT_SHORTAGE");
    assert.equal(f.calls.cancel.length, 0);
    assertNoShortage(f);
  });
  for (const kind of ["provider_business", "timeout", "network"]) {
    test(route + ": pre-GET " + kind + " does not cancel or confirm shortage", async (t) => {
      const f = fixture(t, route, { beforeError: lookupError(kind, kind === "provider_business" ? "2026" : "") });
      const { response, body } = await f.run();
      assert.equal(response.status, 502);
      assert.equal(body.errorCode, "NICE_PAYMENT_LOOKUP_FAILED");
      assert.equal(f.calls.cancel.length, 0);
      assert.equal(f.calls.get.length, 1);
      assert.equal(f.calls.transactions, 0);
      assert.equal(f.document.paymentStatus, "결제완료");
      assert.equal(f.document.depositRefundedAt, undefined);
      assertNoShortage(f);
    });
  }
  for (const thrown of [false, true]) {
    test(route + ": explicit POST 2026 keeps shortage handling (throw=" + thrown + ")", async (t) => {
      const f = fixture(t, route, thrown ? { cancelError: postError("2026") } : { cancelCode: "2026" });
      const { response, body } = await f.run();
      assert.equal(response.status, 409);
      assert.equal(body.errorCode, "NICE_UNSETTLED_AMOUNT_SHORTAGE");
      assert.equal(f.calls.cancel.length, 1);
      assert.equal(f.calls.transactions, 0);
      assert.equal(route === "deposit" ? f.document.paymentInfo.depositRefund.manualActionReason : f.document.cancelRequest.pgCancelBlocked.reason, "unsettled_amount_shortage");
    });
  }
  test(route + ": POST network error retains reconciliation and does not retry", async (t) => {
    const f = fixture(t, route, { cancelError: new Error("mock network failure") });
    const { response, body } = await f.run();
    assert.equal(response.status, 502);
    assert.match(body.errorCode, /NEEDS_RECONCILIATION$/);
    assert.equal(route === "deposit" ? f.document.paymentInfo.depositRefund.status : f.document.cancelRequest.pgCancelClaim.status, "needs_reconciliation");
    assert.equal(f.calls.cancel.length, 1);
    assert.equal(f.document.depositRefundedAt, undefined);
    assertNoShortage(f);
  });
  test(route + ": local error code 2026 after POST is not provider rejection", async (t) => {
    const f = fixture(t, route, { dbError: postError("2026") });
    const { body } = await f.run();
    assert.match(body.errorCode, /NEEDS_RECONCILIATION$/);
    assert.equal(f.calls.cancel.length, 1);
    assertNoShortage(f);
  });
  test(route + ": normal GET and cancel preserve success", async (t) => {
    const f = fixture(t, route);
    const { response, body } = await f.run();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(f.calls.cancel.length, 1);
    assert.equal(f.calls.cancel[0].cancelAmt, route === "deposit" ? 5000 : 10000);
    assert.equal(f.calls.transactions, 1);
    if (route === "deposit") assert.equal(f.document.paymentInfo.depositRefund.status, "completed");
    else assert.equal(f.document.paymentStatus, "결제취소");
  });
}

for (const kind of ["provider_business", "timeout", "network"]) {
  test("deposit: post-cancel GET " + kind + " keeps uncertain refund", async (t) => {
    const f = fixture(t, "deposit", { afterError: lookupError(kind, kind === "provider_business" ? "2026" : "") });
    const { response, body } = await f.run();
    assert.equal(response.status, 502);
    assert.equal(body.errorCode, "NICE_DEPOSIT_REFUND_NEEDS_RECONCILIATION");
    assert.equal(f.calls.cancel.length, 1);
    assert.equal(f.calls.get.length, 2);
    assert.equal(f.calls.transactions, 0);
    assert.equal(f.document.paymentInfo.depositRefund.status, "needs_reconciliation");
    assert.equal(f.document.depositRefundedAt, undefined);
    assertNoShortage(f);
  });
}
