import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const {
  CHECKOUT_INTENT_TTL_MS,
  getCheckoutIntentExpiresAt,
  isCheckoutIntentExpired,
} = compileTsModule("app/store/checkoutIntentPersistence.ts");

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("checkout intent TTL은 생성 시점부터 30분이다", () => {
  const now = 1_000;

  assert.equal(CHECKOUT_INTENT_TTL_MS, 30 * 60 * 1000);
  assert.equal(getCheckoutIntentExpiresAt(now), now + 30 * 60 * 1000);
});

test("checkout intent는 만료 전에는 유효하고 만료 시각부터 폐기한다", () => {
  const expiresAt = 10_000;

  assert.equal(isCheckoutIntentExpired(expiresAt, expiresAt - 1), false);
  assert.equal(isCheckoutIntentExpired(expiresAt, expiresAt), true);
  assert.equal(isCheckoutIntentExpired(expiresAt, expiresAt + 1), true);
});

test("만료 시각이 없거나 올바르지 않은 persisted intent는 폐기한다", () => {
  assert.equal(isCheckoutIntentExpired(undefined, 1_000), true);
  assert.equal(isCheckoutIntentExpired(Number.NaN, 1_000), true);
});

test("임시 store clear와 새 purchase intent는 persisted stale 상태를 제거한다", () => {
  const buyNowStore = readSource("app/store/buyNowStore.ts");
  const pdpBundleStore = readSource("app/store/pdpBundleStore.ts");
  const productDetail = readSource("app/products/[id]/ProductDetailClient.tsx");
  const racketBundle = readSource(
    "app/rackets/[id]/select-string/RacketSelectStringClient.tsx",
  );

  assert.match(buyNowStore, /useBuyNowStore\.persist\.clearStorage\(\)/);
  assert.match(pdpBundleStore, /usePdpBundleStore\.persist\.clearStorage\(\)/);
  assert.match(productDetail, /clearPdpBundle\(\);\s*setBuyNowItem\(buyNowItem\)/);
  assert.match(racketBundle, /clearBuyNow\(\);\s*setItems\(\[/);
});

test("checkout은 hydration 이후 bundle을 일반 buy-now보다 우선한다", () => {
  const checkout = readSource("app/checkout/page.tsx");

  assert.match(
    checkout,
    /mode === "buynow"\s*\? pdpBundleItems\.length > 0\s*\? pdpBundleItems\s*: buyNowItem/,
  );
  assert.match(
    checkout,
    /loading \|\| \(mode === "buynow" && !isCheckoutIntentHydrated\)/,
  );
});
