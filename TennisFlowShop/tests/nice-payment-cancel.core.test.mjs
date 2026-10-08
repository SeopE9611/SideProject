import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
};
const { cancelNicePaymentByTid, approveNicePaymentByTid } = require("../lib/payments/nice/server.ts");

const params = {
  tid: "test/tid",
  orderId: "테스트 주문 ID",
  reason: "보증금 환불",
  clientKey: "mock-client",
  secretKey: "mock-secret",
  apiBaseUrl: "https://nice.invalid/v1/payments",
};

function mockFetch(t, implementation = async () => new Response(JSON.stringify({ resultCode: "0000" }))) {
  for (const [key, value] of [["PORTFOLIO_DEMO_MODE", "false"], ["NODE_ENV", "production"]]) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  return t.mock.method(globalThis, "fetch", implementation);
}

function assertRequest(fetch, body, action = "/cancel") {
  assert.equal(fetch.mock.callCount(), 1);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "https://nice.invalid/v1/payments/test%2Ftid" + action);
  assert.equal(options.method, "POST");
  assert.deepEqual(JSON.parse(options.body), body);
}

test("부분취소는 cancelAmt를 한 번 전송하고 amount를 생략한다", async (t) => {
  const fetch = mockFetch(t);
  await cancelNicePaymentByTid({ ...params, cancelAmt: 5000 });
  assertRequest(fetch, { reason: params.reason, orderId: params.orderId, cancelAmt: 5000 });
});

for (const explicitUndefined of [false, true]) {
  test(`전액취소는 금액 필드를 생략한다 (explicit undefined: ${explicitUndefined})`, async (t) => {
    const fetch = mockFetch(t);
    await cancelNicePaymentByTid(explicitUndefined ? { ...params, cancelAmt: undefined } : params);
    assertRequest(fetch, { reason: params.reason, orderId: params.orderId });
  });
}

for (const [label, cancelAmt] of [
  ["zero", 0], ["negative", -1], ["fraction", 1.5], ["NaN", NaN],
  ["Infinity", Infinity], ["-Infinity", -Infinity],
  ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
  ["string", "5000"], ["null", null], ["boolean", true],
]) {
  test(`잘못된 명시적 금액은 fetch 전에 거부한다: ${label}`, async (t) => {
    const fetch = mockFetch(t);
    await assert.rejects(cancelNicePaymentByTid({ ...params, cancelAmt }), { message: "NICE_CANCEL_AMOUNT_INVALID" });
    assert.equal(fetch.mock.callCount(), 0);
  });
}

test("승인 요청은 기존 amount 필드를 유지한다", async (t) => {
  const fetch = mockFetch(t);
  await approveNicePaymentByTid({ ...params, amount: 5000 });
  assertRequest(fetch, { amount: 5000 }, "");
});

test("취소 fetch 예외는 동일한 오류를 전파하고 재시도하지 않는다", async (t) => {
  const failure = new Error("mock network failure");
  const fetch = mockFetch(t, async () => { throw failure; });
  await assert.rejects(cancelNicePaymentByTid({ ...params, cancelAmt: 5000 }), (error) => error === failure);
  assert.equal(fetch.mock.callCount(), 1);
});
