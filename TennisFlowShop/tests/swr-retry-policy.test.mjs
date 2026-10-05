import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const policy = compileTsModule("lib/fetchers/swrRetryPolicy.ts", { swr: {} });

const failure = (kind, status) => policy.createSWRFailure("failure", { kind, status });

test("명시된 transient 오류만 retry한다", () => {
  assert.equal(policy.isRetryableSWRFailure(failure("network")), true);
  for (const status of [408, 429, 500, 502, 503, 504]) {
    assert.equal(policy.isRetryableSWRFailure(failure("http", status)), true, String(status));
  }

  for (const status of [400, 401, 403, 404, 409, 422, 418]) {
    assert.equal(policy.isRetryableSWRFailure(failure("http", status)), false, String(status));
  }
  assert.equal(policy.isRetryableSWRFailure(failure("abort")), false);
  assert.equal(policy.isRetryableSWRFailure(failure("parse", 200)), false);
  assert.equal(policy.isRetryableSWRFailure(new Error("unknown")), false);
});

test("backoff는 증가하고 jitter와 cap을 적용한다", () => {
  assert.equal(policy.getSWRRetryDelay(1, () => 0), 1_000);
  assert.equal(policy.getSWRRetryDelay(1, () => 0.5), 1_125);
  assert.equal(policy.getSWRRetryDelay(2, () => 0), 2_000);
  assert.equal(policy.getSWRRetryDelay(20, () => 0.999), 5_000);
});

test("SWR retry callback은 최대 두 번만 revalidate를 예약한다", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const scheduled = [];
  globalThis.setTimeout = (callback, delay) => {
    scheduled.push({ callback, delay });
    return 0;
  };

  try {
    let revalidations = 0;
    const retry = policy.swrTransientRetryConfig.onErrorRetry;
    const revalidate = () => { revalidations += 1; };
    retry(failure("http", 503), "key", {}, revalidate, { retryCount: 1, dedupe: true });
    retry(failure("http", 503), "key", {}, revalidate, { retryCount: 2, dedupe: true });
    retry(failure("http", 503), "key", {}, revalidate, { retryCount: 3, dedupe: true });
    retry(failure("http", 404), "key", {}, revalidate, { retryCount: 1, dedupe: true });

    assert.equal(scheduled.length, 2);
    scheduled.forEach(({ callback }) => callback());
    assert.equal(revalidations, 2);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("authenticated fetcher는 HTTP status와 refresh 후 최종 status를 보존한다", async () => {
  let refreshResponse = new Response(null, { status: 200 });
  const fetcherModule = compileTsModule("lib/fetchers/authenticatedSWRFetcher.ts", {
    "@/lib/auth/refresh-mutex": { refreshOnce: async () => refreshResponse },
    "@/lib/debug/resume-debug": {
      debugResumeFetch: () => {},
      warnResumeFetchFailure: () => {},
      getResumeDebugSnapshot: () => ({
        online: true,
        visibilityState: "visible",
        wasRecentlyResumed: false,
      }),
    },
    "@/lib/fetchers/swrRetryPolicy": policy,
  });

  globalThis.fetch = async () => new Response('{"message":"없음"}', { status: 404 });
  await assert.rejects(fetcherModule.authenticatedSWRFetcher("/404"), (error) => {
    assert.equal(error.status, 404);
    assert.equal(error.kind, "http");
    return true;
  });

  globalThis.fetch = async () => new Response(null, { status: 503 });
  await assert.rejects(fetcherModule.authenticatedSWRFetcher("/503"), (error) => {
    assert.equal(error.status, 503);
    return true;
  });

  const responses = [new Response(null, { status: 401 }), new Response(null, { status: 403 })];
  globalThis.fetch = async () => responses.shift();
  await assert.rejects(fetcherModule.authenticatedSWRFetcher("/auth"), (error) => {
    assert.equal(error.status, 403);
    assert.equal(policy.isRetryableSWRFailure(error), false);
    return true;
  });

  refreshResponse = new Response(null, { status: 401 });
});

test("tracking error와 대표 read consumer가 공통 계약을 사용한다", () => {
  const tracking = readFileSync(new URL("../lib/fetchers/trackingSWRFetcher.ts", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../app/mypage/orders/_components/OrderDetailClient.tsx", import.meta.url), "utf8");
  const history = readFileSync(new URL("../app/mypage/orders/_components/OrderHistory.tsx", import.meta.url), "utf8");

  assert.match(tracking, /TrackingSWRFetcherError = SWRHttpError/);
  assert.match(tracking, /kind: "http"/);
  assert.match(detail, /\.\.\.swrTransientRetryConfig[\s\S]*revalidateOnFocus: false/);
  assert.match(history, /\.\.\.swrTransientRetryConfig[\s\S]*revalidateOnFocus: false/);
});
