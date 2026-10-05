import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const consumers = [
  "lib/hooks/useMessageList.ts",
  "lib/hooks/useMessageDetail.ts",
  "app/mypage/tabs/QnAList.tsx",
  "app/mypage/tabs/PassList.tsx",
  "app/mypage/tabs/OrderList.tsx",
  "app/mypage/tabs/RentalsList.tsx",
  "app/mypage/tabs/AcademyApplicationsTab.tsx",
];

test("1차 일반 GET/read consumer가 transient retry policy를 명시적으로 사용한다", () => {
  for (const path of consumers) {
    const source = read(path);
    assert.match(source, /authenticatedSWRFetcher/);
    assert.match(source, /import \{ swrTransientRetryConfig \} from "@\/lib\/fetchers\/swrRetryPolicy";/);
    assert.match(source, /\.\.\.swrTransientRetryConfig/);
    assert.match(source, /revalidateOnFocus: false/);
  }

  for (const path of ["lib/hooks/useMessageList.ts", "lib/hooks/useMessageDetail.ts", "app/mypage/tabs/PassList.tsx", "app/mypage/tabs/OrderList.tsx", "app/mypage/tabs/QnAList.tsx", "app/mypage/tabs/RentalsList.tsx"]) {
    assert.match(read(path), /revalidateOnReconnect: false/);
  }

  for (const path of ["app/mypage/tabs/OrderList.tsx", "app/mypage/tabs/QnAList.tsx"]) {
    assert.match(read(path), /revalidateFirstPage: true/);
  }
});

test("mutation handler는 일반 fetch를 유지하고 retry policy는 SWR option에만 적용된다", () => {
  const order = read("app/mypage/tabs/OrderList.tsx");
  const rentals = read("app/mypage/tabs/RentalsList.tsx");
  const academy = read("app/mypage/tabs/AcademyApplicationsTab.tsx");

  assert.match(order, /method: "POST"/);
  assert.match(rentals, /method: "POST"/);
  assert.match(academy, /method: "DELETE"/);
  for (const source of [order, rentals, academy]) {
    assert.doesNotMatch(source, /fetch\([^)]*,\s*\{[\s\S]*?\.\.\.swrTransientRetryConfig/);
    assert.match(source, /await mutate\(\)/);
  }
});

test("polling, tracking, POST 조회 및 explicit retry-off consumer는 제외 상태를 유지한다", () => {
  for (const path of ["lib/hooks/useUnreadMessageCount.ts", "lib/hooks/useUnreadNotificationCount.ts"]) {
    const source = read(path);
    assert.match(source, /refreshInterval: 60_000/);
    assert.doesNotMatch(source, /swrTransientRetryConfig/);
  }

  const tracking = read("app/mypage/tabs/_components/OrderShippingInfoDialog.tsx");
  assert.match(tracking, /trackingSWRFetcher/);
  assert.doesNotMatch(tracking, /swrTransientRetryConfig/);

  const cart = read("app/cart/CartPageClient.tsx");
  assert.match(cart, /method: "POST"/);
  assert.doesNotMatch(cart, /swrTransientRetryConfig/);

  for (const path of ["app/board/qna/[id]/page.tsx", "app/board/notice/_components/NoticeDetailClient.tsx"]) {
    const source = read(path);
    assert.match(source, /shouldRetryOnError: false/);
    assert.match(source, /onErrorRetry: \(\) => \{\}/);
    assert.doesNotMatch(source, /swrTransientRetryConfig/);
  }
});
