import assert from "node:assert/strict";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const {
  DELIVERY_TRACKER_RETRY_MAX_DELAY_MS,
  fetchDeliveryTrackerSummary,
  getDeliveryTrackerRetryDelay,
  shouldRetryDeliveryTrackerGraphQLError,
  shouldRetryDeliveryTrackerHttpStatus,
} = compileTsModule("lib/shipping/delivery-tracker.ts");

const requestParams = {
  carrierId: "kr.cjlogistics",
  trackingNumber: "1234567890",
  clientId: "test-client",
  clientSecret: "test-secret",
  carrierDisplayName: "테스트 택배",
};

const successPayload = {
  data: {
    track: {
      trackingNumber: requestParams.trackingNumber,
      lastEvent: {
        time: "2026-10-05T00:00:00Z",
        status: { code: "IN_TRANSIT", name: "배송중" },
        location: { name: "물류센터" },
        description: "이동 중",
      },
      events: { edges: [] },
    },
  },
};

function mockResponse(status, payload = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

async function withFetchSequence(sequence, run) {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  let fetchCount = 0;

  globalThis.fetch = async () => {
    const next = sequence[fetchCount];
    fetchCount += 1;
    if (next instanceof Error) throw next;
    return next;
  };
  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };

  try {
    await run(() => fetchCount);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }
}

test("배송조회 HTTP retry 분류는 지정된 transient status만 허용한다", () => {
  for (const status of [408, 429, 500, 502, 503, 504]) {
    assert.equal(shouldRetryDeliveryTrackerHttpStatus(status), true, `${status} should retry`);
  }
  for (const status of [400, 401, 403, 404, 409, 422]) {
    assert.equal(shouldRetryDeliveryTrackerHttpStatus(status), false, `${status} should not retry`);
  }
});

test("배송조회 GraphQL retry 분류는 INTERNAL만 허용한다", () => {
  assert.equal(shouldRetryDeliveryTrackerGraphQLError("INTERNAL"), true);
  for (const errorCode of [
    "NOT_FOUND",
    "BAD_REQUEST",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "UNKNOWN",
  ]) {
    assert.equal(shouldRetryDeliveryTrackerGraphQLError(errorCode), false);
  }
});

test("배송조회 retry delay는 exponential jitter와 cap을 적용한다", () => {
  assert.equal(getDeliveryTrackerRetryDelay(1, () => 0), 400);
  assert.equal(getDeliveryTrackerRetryDelay(1, () => 0.999), 599);
  assert.equal(getDeliveryTrackerRetryDelay(2, () => 0), 800);
  assert.equal(getDeliveryTrackerRetryDelay(2, () => 0.999), 999);
  assert.equal(
    getDeliveryTrackerRetryDelay(10, () => 0.999),
    DELIVERY_TRACKER_RETRY_MAX_DELAY_MS,
  );
});

test("network failure 뒤 성공하면 두 번째 응답을 반환한다", async () => {
  await withFetchSequence([new Error("network"), mockResponse(200, successPayload)], async (count) => {
    const result = await fetchDeliveryTrackerSummary(requestParams);
    assert.equal(result.success, true);
    assert.equal(count(), 2);
  });
});

test("503 뒤 성공하면 두 번째 응답을 반환한다", async () => {
  await withFetchSequence([mockResponse(503), mockResponse(200, successPayload)], async (count) => {
    const result = await fetchDeliveryTrackerSummary(requestParams);
    assert.equal(result.success, true);
    assert.equal(count(), 2);
  });
});

test("503, 502 뒤 성공하면 세 번째 응답을 반환한다", async () => {
  await withFetchSequence(
    [mockResponse(503), mockResponse(502), mockResponse(200, successPayload)],
    async (count) => {
      const result = await fetchDeliveryTrackerSummary(requestParams);
      assert.equal(result.success, true);
      assert.equal(count(), 3);
    },
  );
});

test("지속적인 503은 세 번만 요청하고 기존 failure shape를 반환한다", async () => {
  await withFetchSequence(
    [mockResponse(503), mockResponse(503), mockResponse(503)],
    async (count) => {
      const result = await fetchDeliveryTrackerSummary(requestParams);
      assert.deepEqual(result, {
        success: false,
        errorCode: "UNKNOWN",
        statusCode: 503,
        message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
      });
      assert.equal(count(), 3);
    },
  );
});

for (const status of [404, 401]) {
  test(`HTTP ${status}은 retry하지 않는다`, async () => {
    await withFetchSequence([mockResponse(status)], async (count) => {
      const result = await fetchDeliveryTrackerSummary(requestParams);
      assert.equal(result.success, false);
      assert.equal(result.statusCode, status);
      assert.equal(count(), 1);
    });
  });
}

function graphQLError(errorCode) {
  return mockResponse(200, { errors: [{ extensions: { code: errorCode } }] });
}

test("GraphQL INTERNAL 뒤 성공하면 retry 결과를 반환한다", async () => {
  await withFetchSequence(
    [graphQLError("INTERNAL"), mockResponse(200, successPayload)],
    async (count) => {
      const result = await fetchDeliveryTrackerSummary(requestParams);
      assert.equal(result.success, true);
      assert.equal(count(), 2);
    },
  );
});

for (const errorCode of ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"]) {
  test(`GraphQL ${errorCode}은 retry하지 않는다`, async () => {
    await withFetchSequence([graphQLError(errorCode)], async (count) => {
      const originalWarn = console.warn;
      console.warn = () => {};
      try {
        const result = await fetchDeliveryTrackerSummary(requestParams);
        assert.equal(result.success, false);
        assert.equal(result.errorCode, errorCode);
        assert.equal(count(), 1);
      } finally {
        console.warn = originalWarn;
      }
    });
  });
}
