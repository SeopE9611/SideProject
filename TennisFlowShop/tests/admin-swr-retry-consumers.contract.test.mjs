import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const consumers = [
  "app/admin/users/_hooks/useUserList.ts",
  "app/admin/users/_hooks/useUserSessions.ts",
  "app/admin/products/ProductsClient.tsx",
  "app/features/orders/components/OrdersClient.tsx",
  "app/admin/rentals/_components/AdminRentalsClient.tsx",
  "app/admin/packages/page.tsx",
];

test("선별한 Admin GET/read consumer가 transient retry policy를 명시적으로 사용한다", () => {
  for (const path of consumers) {
    const source = read(path);
    assert.match(source, /authenticatedSWRFetcher/);
    assert.match(source, /import \{ swrTransientRetryConfig \} from "@\/lib\/fetchers\/swrRetryPolicy";/);
    assert.match(source, /\.\.\.swrTransientRetryConfig/);
    assert.match(source, /revalidateOnFocus: false/);
    assert.match(source, /revalidateOnReconnect: false/);
  }

  assert.match(read("app/admin/products/ProductsClient.tsx"), /keepPreviousData: true/);
  assert.match(read("app/admin/packages/page.tsx"), /dedupingInterval: 1000/);
});

test("Admin mutation은 기존 method와 수동 mutate를 유지하고 retry option과 격리된다", () => {
  const products = read("app/admin/products/ProductsClient.tsx");
  const orders = read("app/features/orders/components/OrdersClient.tsx");
  const rentals = read("app/admin/rentals/_components/AdminRentalsClient.tsx");
  const packages = read("app/admin/packages/page.tsx");

  assert.match(products, /adminMutator\([^\n]+\{ method: "DELETE" \}\)/);
  assert.match(orders, /method: "POST"/);
  assert.match(rentals, /method: "POST"/);
  assert.match(packages, /mutate\(\)/);
  for (const source of [products, orders, rentals, packages]) {
    assert.doesNotMatch(source, /(?:fetch|adminMutator)\([^)]*,\s*\{[\s\S]*?\.\.\.swrTransientRetryConfig/);
    assert.match(source, /mutate\(\)/);
  }
});

test("복합·행 단위·명시적 retry-off Admin surface는 제외 상태를 유지한다", () => {
  const navigation = read("components/admin/AdminNavigationShell.tsx");
  const dashboard = read("app/admin/dashboard/_components/AdminDashboardClient_view.tsx");
  const operations = read("app/admin/operations/_components/OperationsClient.tsx");

  for (const source of [navigation, dashboard, operations]) {
    assert.match(source, /shouldRetryOnError: false/);
    assert.doesNotMatch(source, /swrTransientRetryConfig/);
  }

  for (const path of [
    "app/admin/rackets/_components/AdminRacketsClient.tsx",
    "app/admin/reviews/_components/AdminReviewListClient.tsx",
  ]) {
    assert.doesNotMatch(read(path), /swrTransientRetryConfig/);
  }
});
