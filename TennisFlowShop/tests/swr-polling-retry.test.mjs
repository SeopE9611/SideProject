import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const policy = compileTsModule("lib/fetchers/swrRetryPolicy.ts", { swr: {} });
const failure = (kind, status) => policy.createSWRFailure("failure", { kind, status });
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("polling recovery는 transient 오류만 polling cadence로 예약한다", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const scheduled = [];
  globalThis.setTimeout = (callback, delay) => {
    scheduled.push({ callback, delay });
    return 0;
  };

  try {
    const retry = policy.createSWRPollingRetryConfig(60_000).onErrorRetry;
    const config = {
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      isVisible: () => true,
      isOnline: () => true,
    };
    const revalidate = () => {};

    retry(failure("network"), "key", config, revalidate, { retryCount: 1, dedupe: true });
    for (const status of [408, 429, 500, 502, 503, 504]) {
      retry(failure("http", status), "key", config, revalidate, { retryCount: 20, dedupe: true });
    }
    for (const status of [400, 401, 403, 404, 409, 422]) {
      retry(failure("http", status), "key", config, revalidate, { retryCount: 1, dedupe: true });
    }
    retry(failure("abort"), "key", config, revalidate, { retryCount: 1, dedupe: true });
    retry(failure("parse", 200), "key", config, revalidate, { retryCount: 1, dedupe: true });

    assert.equal(scheduled.length, 7);
    assert.deepEqual(scheduled.map(({ delay }) => delay), Array(7).fill(60_000));
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("반복 transient 오류를 새 polling cycle로 복구할 수 있다", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const scheduled = [];
  globalThis.setTimeout = (callback, delay) => {
    scheduled.push({ callback, delay });
    return 0;
  };

  try {
    const retry = policy.createSWRPollingRetryConfig(60_000).onErrorRetry;
    const config = {
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      isVisible: () => true,
      isOnline: () => true,
    };
    const options = [];
    const revalidate = (nextOptions) => options.push(nextOptions);

    retry(failure("http", 503), "key", config, revalidate, { retryCount: 25, dedupe: true });
    scheduled.shift().callback();
    assert.deepEqual(options, [{ retryCount: 0, dedupe: true }]);

    retry(failure("http", 503), "key", config, revalidate, { retryCount: 1, dedupe: true });
    assert.equal(scheduled[0].delay, 60_000);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("hidden 또는 offline이면 예약된 recovery request를 보내지 않는다", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const scheduled = [];
  globalThis.setTimeout = (callback) => {
    scheduled.push(callback);
    return 0;
  };

  try {
    const retry = policy.createSWRPollingRetryConfig(60_000).onErrorRetry;
    let revalidations = 0;
    const revalidate = () => { revalidations += 1; };
    const options = { retryCount: 1, dedupe: true };

    retry(failure("network"), "key", {
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      isVisible: () => false,
      isOnline: () => true,
    }, revalidate, options);
    retry(failure("network"), "key", {
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      isVisible: () => true,
      isOnline: () => false,
    }, revalidate, options);
    scheduled.forEach((callback) => callback());

    assert.equal(revalidations, 0);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("unread consumer는 기존 cadence와 dedupe를 유지하며 polling recovery를 사용한다", () => {
  const message = read("lib/hooks/useUnreadMessageCount.ts");
  const notification = read("lib/hooks/useUnreadNotificationCount.ts");

  for (const source of [message, notification]) {
    assert.match(source, /authenticatedSWRFetcher/);
    assert.match(source, /createSWRPollingRetryConfig\(60_000\)/);
    assert.match(source, /refreshInterval: 60_000/);
    assert.match(source, /revalidateOnFocus: true/);
    assert.match(source, /revalidateOnReconnect: true/);
    assert.doesNotMatch(source, /swrTransientRetryConfig/);
  }
  assert.match(message, /dedupingInterval: 30_000/);
  assert.match(notification, /dedupingInterval: 10_000/);
});

test("별도 polling consumer와 비활성 polling은 recovery 정책을 사용하지 않는다", () => {
  const maintenance = read("app/admin/reviews/_components/AdminReviewMaintenancePanel.tsx");
  const cart = read("app/cart/CartPageClient.tsx");

  assert.match(maintenance, /refreshInterval: loading \? 1500 : 0/);
  assert.match(maintenance, /shouldRetryOnError: false/);
  assert.doesNotMatch(maintenance, /createSWRPollingRetryConfig/);
  assert.match(cart, /refreshInterval: 0/);
  assert.doesNotMatch(cart, /createSWRPollingRetryConfig/);
});
