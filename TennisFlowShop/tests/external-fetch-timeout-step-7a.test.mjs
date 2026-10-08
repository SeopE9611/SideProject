import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const nextResponse = {
  json: (body, options = {}) => ({ body, status: options.status ?? 200 }),
  redirect: (url) => ({ status: 307, location: url }),
};
const timeoutError = () => new DOMException("Request timed out", "TimeoutError");

// Expire real AbortSignals deterministically; never wait for wall-clock time.
async function withNetworkMock(run) {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;
  const originalError = console.error;
  const controllers = new Map();
  const timeouts = [];
  AbortSignal.timeout = (ms) => {
    timeouts.push(ms);
    const controller = new AbortController();
    controllers.set(controller.signal, controller);
    return controller.signal;
  };
  console.error = () => {};
  try {
    await run({ timeouts, expire: (signal) => controllers.get(signal).abort(timeoutError()) });
  } finally {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
    console.error = originalError;
  }
}

const { GET: weather } = compileTsModule("app/api/weather/route.ts", {
  "next/server": { NextResponse: nextResponse },
});

for (const stage of ["fetch", "body"]) {
  test(`Weather ${stage} timeout preserves existing 500 JSON without retry`, async () => {
    const previous = process.env.OPENWEATHER_API_KEY;
    process.env.OPENWEATHER_API_KEY = "test-key";
    try {
      await withNetworkMock(async ({ timeouts, expire }) => {
        let count = 0;
        globalThis.fetch = async (_url, { signal, cache }) => {
          count += 1;
          assert.equal(cache, "no-store");
          const fail = () => {
            expire(signal);
            signal.throwIfAborted();
          };
          if (stage === "fetch") fail();
          return { ok: true, json: async () => fail() };
        };
        assert.deepEqual(await weather(), {
          status: 500,
          body: { ok: false, message: "날씨 정보를 불러오는 중 오류가 발생했습니다." },
        });
        assert.deepEqual(timeouts, [5_000]);
        assert.equal(count, 1);
      });
    } finally {
      if (previous === undefined) delete process.env.OPENWEATHER_API_KEY;
      else process.env.OPENWEATHER_API_KEY = previous;
    }
  });
}

test("Weather success payload and external non-ok contract remain unchanged", async () => {
  const previous = process.env.OPENWEATHER_API_KEY;
  process.env.OPENWEATHER_API_KEY = "test-key";
  try {
    await withNetworkMock(async () => {
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ main: { temp: 20, temp_min: 18, temp_max: 22 }, weather: [{ description: "맑음" }] }) });
      assert.deepEqual(await weather(), { status: 200, body: { ok: true, temp: 20, tempMin: 18, tempMax: 22, description: "맑음" } });
      globalThis.fetch = async () => ({ ok: false });
      assert.deepEqual(await weather(), { status: 500, body: { ok: false, message: "외부 날씨 API 호출에 실패했습니다." } });
    });
  } finally {
    if (previous === undefined) delete process.env.OPENWEATHER_API_KEY;
    else process.env.OPENWEATHER_API_KEY = previous;
  }
});

for (const provider of ["kakao", "naver"]) {
  let dbCalls = 0;
  const { GET } = compileTsModule(`app/api/oauth/${provider}/callback/route.ts`, {
    "next/server": { NextResponse: nextResponse },
    jsonwebtoken: {},
    "@/lib/getBaseUrl": { getBaseUrl: () => "https://shop.example" },
    "@/lib/mongodb": { getDb: () => { dbCalls += 1; throw new Error("DB should not run"); } },
    "@/lib/cookieOptions": {},
    "@/lib/constants": {},
    "@/lib/claims": {},
    "@/lib/admin/adminCsrf": {},
    "@/lib/admin/roles": {},
  });
  for (const stage of ["token", "profile"]) {
    for (const phase of ["fetch", "body"]) {
      test(`${provider} ${stage} ${phase} timeout redirects to login with no retry/DB`, async () => {
        const idKey = `${provider.toUpperCase()}_CLIENT_ID`;
        const secretKey = `${provider.toUpperCase()}_CLIENT_SECRET`;
        const previousId = process.env[idKey];
        const previousSecret = process.env[secretKey];
        process.env[idKey] = "test-client";
        process.env[secretKey] = "test-secret";
        dbCalls = 0;
        try {
          await withNetworkMock(async ({ timeouts, expire }) => {
            const signals = [];
            globalThis.fetch = async (_url, { signal, method }) => {
              signals.push(signal);
              const currentStage = signals.length === 1 ? "token" : "profile";
              assert.equal(method, currentStage === "token" ? "POST" : "GET");
              const fail = () => { expire(signal); signal.throwIfAborted(); };
              if (stage === currentStage && phase === "fetch") fail();
              return {
                ok: true,
                json: async () => {
                  if (stage === currentStage) fail();
                  return { access_token: "test-access-token" };
                },
              };
            };
            const response = await GET({
              url: "https://shop.example/callback?code=test-code&state=test-state",
              cookies: { get: () => ({ value: "test-state" }) },
            });
            assert.deepEqual(response, { status: 307, location: "https://shop.example/login?tab=login" });
            const expectedCalls = stage === "token" ? 1 : 2;
            assert.equal(signals.length, expectedCalls);
            assert.equal(new Set(signals).size, expectedCalls);
            assert.deepEqual(timeouts, Array(expectedCalls).fill(7_000));
            assert.equal(dbCalls, 0);
          });
        } finally {
          if (previousId === undefined) delete process.env[idKey]; else process.env[idKey] = previousId;
          if (previousSecret === undefined) delete process.env[secretKey]; else process.env[secretKey] = previousSecret;
        }
      });
    }
  }
}

test("Step 7-A does not apply timeout/retry helpers to NICE/Toss payment mutations", () => {
  for (const file of ["lib/payments/nice/server.ts", "lib/payments/toss/server.ts"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /AbortSignal\.timeout|AbortController|fetchWithTimeout|REQUEST_TIMEOUT_MS/);
  }
  const discord = readFileSync(new URL("../lib/admin-alerts/sendAdminOperationalAlert.ts", import.meta.url), "utf8");
  assert.match(discord, /setTimeout\(\(\) => controller\.abort\(\), 3000\)/);
  assert.match(discord, /finally\s*\{\s*clearTimeout\(timeout\)/);
});
