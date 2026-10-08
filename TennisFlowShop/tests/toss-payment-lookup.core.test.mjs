import assert from "node:assert/strict";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const lookup = compileTsModule("lib/payments/toss/status.ts", { "server-only": {} });
const { confirmTossPayment } = compileTsModule("lib/payments/toss/server.ts");
const canonical = { paymentKey: "key/with?reserved#chars", orderId: "toss_order-123", expectedAmount: 5000 };
const payment = { paymentKey: canonical.paymentKey, orderId: canonical.orderId, totalAmount: 5000, status: "DONE", balanceAmount: 5000, card: { number: "sensitive-card" }, secret: "sensitive-body" };

function setup(t, implementation) {
  for (const [key, value] of [["TOSS_WIDGET_SECRET_KEY", "mock-secret"], ["PORTFOLIO_DEMO_MODE", "false"]]) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const controller = new AbortController();
  const timeout = t.mock.method(AbortSignal, "timeout", () => controller.signal);
  const fetch = t.mock.method(globalThis, "fetch", implementation);
  return { controller, timeout, fetch };
}
const response = (body = payment, status = 200) => new Response(JSON.stringify(body), { status });
async function expectError(kind, params = canonical, by = "paymentKey", extras = {}) {
  await assert.rejects(by === "paymentKey" ? lookup.getTossPaymentByPaymentKey(params) : lookup.getTossPaymentByOrderId(params), (error) => {
    assert.equal(error.provider, "toss");
    assert.equal(error.operation, "lookup");
    assert.equal(error.kind, kind);
    assert.equal(error.message, "TOSS_LOOKUP_" + kind.toUpperCase());
    for (const [key, value] of Object.entries(extras)) assert.equal(error[key], value);
    assert.equal(error.cause, undefined);
    assert.equal(JSON.stringify(error).includes("mock-secret"), false);
    assert.equal(JSON.stringify(error).includes("sensitive"), false);
    return true;
  });
}

for (const by of ["paymentKey", "orderId"]) {
  test(by + ": GET URL, Basic auth, no-store, shared 10s signal, minimal DTO", async (t) => {
    const { controller, timeout, fetch } = setup(t, async () => response());
    const fn = by === "paymentKey" ? lookup.getTossPaymentByPaymentKey : lookup.getTossPaymentByOrderId;
    const observation = await fn(canonical);
    assert.deepEqual(Object.keys(observation).sort(), ["paymentKey", "orderId", "totalAmount", "status", "observedAt", "balanceAmount"].sort());
    assert.equal(observation.status, "DONE");
    assert.equal(observation.totalAmount, 5000);
    assert.ok(observation.observedAt instanceof Date);
    assert.equal(fetch.mock.callCount(), 1);
    const [url, options] = fetch.mock.calls[0].arguments;
    assert.equal(url, "https://api.tosspayments.com/v1/payments/" + (by === "paymentKey" ? encodeURIComponent(canonical.paymentKey) : "orders/" + encodeURIComponent(canonical.orderId)));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Basic " + Buffer.from("mock-secret:").toString("base64"));
    assert.equal(options.cache, "no-store");
    assert.equal(options.body, undefined);
    assert.equal(options.signal, controller.signal);
    assert.equal(lookup.TOSS_PAYMENT_LOOKUP_TIMEOUT_MS, 10000);
    assert.deepEqual(timeout.mock.calls[0].arguments, [10000]);
  });
}
test("orderId lookup works without a stored paymentKey", async (t) => {
  setup(t, async () => response());
  const observed = await lookup.getTossPaymentByOrderId({ orderId: canonical.orderId, expectedAmount: 5000 });
  assert.equal(observed.paymentKey, canonical.paymentKey);
});
test("orderId lookup rejects an explicitly invalid optional paymentKey before fetch", async (t) => {
  const { fetch } = setup(t, async () => response());
  await expectError("invalid_input", { ...canonical, paymentKey: null }, "orderId");
  assert.equal(fetch.mock.callCount(), 0);
});
test("zero amount and omitted optional balance are preserved without normalization", async (t) => {
  setup(t, async () => response({ ...payment, totalAmount: 0, balanceAmount: undefined }));
  const observed = await lookup.getTossPaymentByPaymentKey({ ...canonical, expectedAmount: 0 });
  assert.equal(observed.totalAmount, 0);
  assert.equal(Object.hasOwn(observed, "balanceAmount"), false);
});
for (const status of [200, 502]) {
  test("body read failure retains HTTP status: " + status, async (t) => {
    const { fetch } = setup(t, async () => ({ status, ok: status === 200, text: async () => { throw new Error("sensitive-body"); } }));
    await expectError(status === 200 ? "invalid_response" : "provider_http", canonical, "paymentKey", { httpStatus: status });
    assert.equal(fetch.mock.callCount(), 1);
  });
}

for (const status of ["DONE", "READY", "IN_PROGRESS", "WAITING_FOR_DEPOSIT", "ABORTED", "EXPIRED", "CANCELED", "PARTIAL_CANCELED"]) {
  test("valid provider state is an observation: " + status, async (t) => {
    const { fetch } = setup(t, async () => response({ ...payment, status }));
    assert.equal((await lookup.getTossPaymentByPaymentKey(canonical)).status, status);
    assert.equal(fetch.mock.callCount(), 1);
  });
}
for (const [label, patch] of [
  ["key", { paymentKey: "other-key" }], ["order", { orderId: "other-order" }], ["amount", { totalAmount: 4999 }],
]) {
  for (const by of ["paymentKey", "orderId"]) {
    test(by + ": canonical mismatch " + label, async (t) => {
      const { fetch } = setup(t, async () => response({ ...payment, ...patch }));
      await expectError("identity_mismatch", canonical, by, { httpStatus: 200 });
      assert.equal(fetch.mock.callCount(), 1);
    });
  }
}
for (const body of ["", "{", "bad JSON", "null", "[]", '"text"']) {
  test("invalid JSON/body: " + body, async (t) => {
    const { fetch } = setup(t, async () => new Response(body));
    await expectError("invalid_response");
    assert.equal(fetch.mock.callCount(), 1);
  });
}
for (const patch of [
  { paymentKey: undefined }, { orderId: undefined }, { totalAmount: "5000" }, { totalAmount: 5000.5 },
  { totalAmount: Number.MAX_SAFE_INTEGER + 1 }, { status: undefined }, { status: "UNKNOWN_NEW_STATE" },
  { balanceAmount: -1 }, { balanceAmount: "5000" }, { balanceAmount: 5001 }, { balanceAmount: null },
]) {
  test("invalid Payment structure: " + JSON.stringify(patch), async (t) => {
    setup(t, async () => response({ ...payment, ...patch }));
    await expectError("invalid_response");
  });
}
for (const status of [404, 502]) {
  for (const validBody of [false, true]) {
    test("HTTP " + status + " keeps status and safe code; no retry", async (t) => {
      const { fetch } = setup(t, async () => validBody ? response({ code: "NOT_FOUND_PAYMENT", message: "sensitive-card mock-secret" }, status) : new Response("{", { status }));
      await expectError("provider_http", canonical, "paymentKey", { httpStatus: status, providerCode: validBody ? "NOT_FOUND_PAYMENT" : undefined });
      assert.equal(fetch.mock.callCount(), 1);
    });
  }
}
test("network failure has no raw cause or retry", async (t) => {
  const { fetch } = setup(t, async () => { throw new Error("mock-secret sensitive-card"); });
  await expectError("network");
  assert.equal(fetch.mock.callCount(), 1);
});
test("headers timeout", async (t) => {
  const f = setup(t, async () => {
    f.controller.abort(new DOMException("deadline", "TimeoutError"));
    throw f.controller.signal.reason;
  });
  await expectError("timeout");
  assert.equal(f.fetch.mock.callCount(), 1);
});
test("body stream timeout after headers shares deadline", async (t) => {
  const f = setup(t, async (_url, options) => {
    const res = new Response(new ReadableStream({
      start(controller) { options.signal.addEventListener("abort", () => controller.error(options.signal.reason), { once: true }); },
    }));
    const text = res.text.bind(res);
    res.text = () => {
      const pending = text();
      f.controller.abort(new DOMException("deadline", "TimeoutError"));
      return pending;
    };
    return res;
  });
  await expectError("timeout", canonical, "paymentKey", { httpStatus: 200 });
  assert.equal(f.fetch.mock.callCount(), 1);
  assert.equal(f.timeout.mock.callCount(), 1);
});
for (const patch of [
  { paymentKey: "" }, { paymentKey: null }, { paymentKey: " key " }, { paymentKey: "k".repeat(201) },
  { orderId: "" }, { orderId: "short" }, { orderId: "order/invalid" }, { orderId: "x".repeat(65) },
  { expectedAmount: -1 }, { expectedAmount: 1.5 }, { expectedAmount: NaN }, { expectedAmount: Infinity },
  { expectedAmount: Number.MAX_SAFE_INTEGER + 1 }, { expectedAmount: "5000" },
]) {
  test("invalid canonical input has fetch 0: " + JSON.stringify(patch), async (t) => {
    const { fetch } = setup(t, async () => response());
    await expectError("invalid_input", { ...canonical, ...patch });
    assert.equal(fetch.mock.callCount(), 0);
  });
}
test("missing secret is rejected before fetch", async (t) => {
  const { fetch } = setup(t, async () => response());
  delete process.env.TOSS_WIDGET_SECRET_KEY;
  await expectError("configuration");
  assert.equal(fetch.mock.callCount(), 0);
});
test("demo guard matches confirm and blocks both GET paths", async (t) => {
  const { fetch } = setup(t, async () => response());
  process.env.PORTFOLIO_DEMO_MODE = "true";
  for (const fn of [lookup.getTossPaymentByPaymentKey, lookup.getTossPaymentByOrderId]) {
    await assert.rejects(fn(canonical), { code: "PORTFOLIO_DEMO_PAYMENT_DISABLED", status: 403 });
  }
  assert.equal(fetch.mock.callCount(), 0);
});
test("confirm POST is unchanged: amount body, no signal, no retry/idempotency header", async (t) => {
  const { timeout, fetch } = setup(t, async () => response());
  const params = { paymentKey: canonical.paymentKey, orderId: canonical.orderId, amount: 5000 };
  await confirmTossPayment(params);
  assert.equal(fetch.mock.callCount(), 1);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "https://api.tosspayments.com/v1/payments/confirm");
  assert.equal(options.method, "POST");
  assert.deepEqual(JSON.parse(options.body), params);
  assert.equal(Object.hasOwn(options, "signal"), false);
  assert.equal(Object.hasOwn(options.headers, "Idempotency-Key"), false);
  assert.equal(timeout.mock.callCount(), 0);
});
