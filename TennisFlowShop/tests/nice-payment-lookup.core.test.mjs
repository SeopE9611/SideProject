import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(require("node:fs").readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
};
const { getNicePaymentByTid, approveNicePaymentByTid, cancelNicePaymentByTid, NICE_PAYMENT_LOOKUP_TIMEOUT_MS } = require("../lib/payments/nice/server.ts");
const params = { tid: "test/tid", clientKey: "mock-client", secretKey: "mock-secret", apiBaseUrl: "https://nice.invalid/v1/payments/" };
const success = { resultCode: "0000", resultMsg: "정상", status: "paid", tid: params.tid, orderId: "mock-order", amount: 5000, card: { cardName: "mock" } };

function setup(t, implementation) {
  for (const [key, value] of [["PORTFOLIO_DEMO_MODE", "false"], ["NODE_ENV", "production"]]) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const controller = new AbortController();
  const timeout = t.mock.method(AbortSignal, "timeout", () => controller.signal);
  const fetch = t.mock.method(globalThis, "fetch", implementation);
  return { controller, timeout, fetch };
}

async function expectError(kind, extras = {}) {
  await assert.rejects(getNicePaymentByTid(params), (error) => {
    assert.equal(error.provider, "nicepay");
    assert.equal(error.operation, "lookup");
    assert.equal(error.kind, kind);
    for (const [key, value] of Object.entries(extras)) assert.equal(error[key], value);
    return true;
  });
}

test("GET contract: URL, Basic auth, no-store, 10s signal and flattened response", async (t) => {
  const { controller, timeout, fetch } = setup(t, async () => new Response(JSON.stringify(success)));
  const raw = await getNicePaymentByTid(params);
  assert.equal(raw.amount, "5000");
  assert.equal(raw["card.cardName"], "mock");
  assert.equal(raw.resultCode, "0000");
  assert.equal(fetch.mock.callCount(), 1);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "https://nice.invalid/v1/payments/test%2Ftid");
  assert.equal(options.method, "GET");
  assert.equal(options.cache, "no-store");
  assert.equal(options.body, undefined);
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.equal(options.headers.Authorization, "Basic " + Buffer.from("mock-client:mock-secret").toString("base64"));
  assert.equal(options.signal, controller.signal);
  assert.equal(NICE_PAYMENT_LOOKUP_TIMEOUT_MS, 10000);
  assert.deepEqual(timeout.mock.calls[0].arguments, [10000]);
});

test("GET timeout is classified without retry", async (t) => {
  const mocks = setup(t, async () => {
    mocks.controller.abort(new DOMException("deadline", "TimeoutError"));
    throw mocks.controller.signal.reason;
  });
  await expectError("timeout");
  assert.equal(mocks.fetch.mock.callCount(), 1);
});

test("GET network failure preserves cause without retry", async (t) => {
  const cause = new Error("mock DNS failure");
  const { fetch } = setup(t, async () => { throw cause; });
  await expectError("network", { cause });
  assert.equal(fetch.mock.callCount(), 1);
});

for (const body of ["", "{", "not json", "null", "[]", '"text"', "42", "{}", '{"resultCode":0}', '{"resultCode":"0000"}', '{"resultCode":"0000","status":42}']) {
  test("200 invalid body is rejected: " + body, async (t) => {
    const { fetch } = setup(t, async () => new Response(body));
    await expectError("invalid_response", { httpStatus: 200 });
    assert.equal(fetch.mock.callCount(), 1);
  });
}

for (const body of ["", "{", JSON.stringify({ resultCode: "9999", resultMsg: "PG HTTP 오류" })]) {
  test("HTTP error retains status with body: " + body, async (t) => {
    const { fetch } = setup(t, async () => new Response(body, { status: 502 }));
    await expectError("provider_http", { httpStatus: 502, ...(body.startsWith('{"') ? { resultCode: "9999", resultMsg: "PG HTTP 오류", message: "PG HTTP 오류" } : {}) });
    assert.equal(fetch.mock.callCount(), 1);
  });
}

test("business error retains provider code and message", async (t) => {
  const { fetch } = setup(t, async () => new Response(JSON.stringify({ ResultCode: "2026", ResultMsg: "PG business 오류" })));
  await expectError("provider_business", { httpStatus: 200, resultCode: "2026", resultMsg: "PG business 오류", message: "PG business 오류" });
  assert.equal(fetch.mock.callCount(), 1);
});

test("body stream timeout uses the same signal after headers", async (t) => {
  let streamController;
  const mocks = setup(t, async (_url, options) => {
    const response = new Response(new ReadableStream({
      start(controller) {
        streamController = controller;
        options.signal.addEventListener("abort", () => controller.error(options.signal.reason), { once: true });
      },
    }));
    const read = response.text.bind(response);
    response.text = () => {
      const pending = read();
      streamController.enqueue(new TextEncoder().encode('{"resultCode":'));
      mocks.controller.abort(new DOMException("deadline", "TimeoutError"));
      return pending;
    };
    return response;
  });
  await expectError("timeout", { httpStatus: 200 });
  assert.equal(mocks.timeout.mock.callCount(), 1);
  assert.equal(mocks.fetch.mock.callCount(), 1);
});

test("body read failure is invalid_response", async (t) => {
  const { fetch } = setup(t, async () => ({ ok: true, status: 200, text: async () => { throw new Error("body lost"); } }));
  await expectError("invalid_response", { httpStatus: 200 });
  assert.equal(fetch.mock.callCount(), 1);
});

test("non-2xx body read failure retains HTTP status", async (t) => {
  setup(t, async () => ({ ok: false, status: 503, text: async () => { throw new Error("body lost"); } }));
  await expectError("provider_http", { httpStatus: 503 });
});

test("POSTs keep amount contracts, parsing fallback and no timeout signal", async (t) => {
  const { timeout, fetch } = setup(t, async () => new Response("{"));
  assert.deepEqual(await approveNicePaymentByTid({ ...params, amount: 5000 }), {});
  assert.deepEqual(await cancelNicePaymentByTid({ ...params, orderId: "mock-order", reason: "mock", cancelAmt: 5000 }), {});
  assert.equal(timeout.mock.callCount(), 0);
  assert.equal(fetch.mock.callCount(), 2);
  for (const call of fetch.mock.calls) {
    const options = call.arguments[1];
    assert.equal(options.method, "POST");
    assert.equal(Object.hasOwn(options, "signal"), false);
  }
  assert.deepEqual(JSON.parse(fetch.mock.calls[0].arguments[1].body), { amount: 5000 });
  assert.deepEqual(JSON.parse(fetch.mock.calls[1].arguments[1].body), { orderId: "mock-order", reason: "mock", cancelAmt: 5000 });
});
