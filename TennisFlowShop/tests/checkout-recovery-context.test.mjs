import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const TTL_MS = 30 * 60 * 1000;
const recovery = compileTsModule("app/store/checkoutRecoveryContext.ts", {
  "@/app/store/checkoutIntentPersistence": {
    getCheckoutIntentExpiresAt: (now = Date.now()) => now + TTL_MS,
    isCheckoutIntentExpired: (expiresAt, now = Date.now()) =>
      typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= now,
  },
});

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
};

test("명시적 checkout source와 전체 query를 30분 동안 보존한다", () => {
  const storage = createStorage();
  const href = "/checkout?mode=buynow&withService=1&mountingFee=12000&careItemId=care-1";
  const validHrefs = [
    "/checkout?mode=buynow",
    "/checkout?mode=buynow&withService=1&mountingFee=12000",
    "/checkout?source=cart-selection",
    "/checkout?source=cart-selection&withService=1",
  ];
  validHrefs.forEach((validHref) =>
    assert.equal(recovery.isSafeCheckoutRecoveryHref(validHref), true),
  );

  assert.equal(recovery.saveCheckoutRecoveryContext(storage, href, 1_000), true);
  assert.deepEqual(recovery.readCheckoutRecoveryContext(storage, 1_001), {
    href,
    expiresAt: 1_000 + TTL_MS,
  });

  assert.equal(
    recovery.saveCheckoutRecoveryContext(storage, "/checkout?source=cart-selection", 2_000),
    true,
  );
});

test("missing source, malformed, expired, external recovery는 폐기한다", () => {
  const unsafeHrefs = [
    "/checkout",
    "/checkout?unknown=1",
    "https://example.com/checkout?mode=buynow",
    "//example.com/checkout?mode=buynow",
    "javascript:alert(1)",
    "/checkout?mode=buynow&source=cart-selection",
    "/checkout?mode=buynow&source=foo",
    "/checkout?source=cart-selection&mode=foo",
  ];
  unsafeHrefs.forEach((href) => assert.equal(recovery.isSafeCheckoutRecoveryHref(href), false));

  const storage = createStorage();
  storage.setItem(recovery.CHECKOUT_RECOVERY_CONTEXT_KEY, "not-json");
  assert.equal(recovery.readCheckoutRecoveryContext(storage, 1_000), null);
  assert.equal(storage.values.size, 0);

  storage.setItem(
    recovery.CHECKOUT_RECOVERY_CONTEXT_KEY,
    JSON.stringify({ href: "/checkout?mode=buynow&source=foo", expiresAt: 1_000 + TTL_MS }),
  );
  assert.equal(recovery.readCheckoutRecoveryContext(storage, 1_000), null);
  assert.equal(storage.values.size, 0);

  recovery.saveCheckoutRecoveryContext(storage, "/checkout?mode=buynow", 1_000);
  assert.equal(recovery.readCheckoutRecoveryContext(storage, 1_000 + TTL_MS), null);
  assert.equal(storage.values.size, 0);
});

test("checkout은 no-source와 invalid source를 full cart 주문으로 사용하지 않는다", () => {
  const checkout = readFileSync(new URL("../app/checkout/page.tsx", import.meta.url), "utf8");
  assert.match(checkout, /mode === "buynow" && !sp\.has\("source"\)/);
  assert.match(checkout, /isCartSelectionSource && !sp\.has\("mode"\)/);
  assert.match(checkout, /isCartSelectionSource\s*\? selectedCartItems\s*: \[\]/);
  assert.match(checkout, /if \(!hasExplicitCheckoutSource\)/);
});

test("warning failure는 주문 내역 확인을 우선하고 일반 failure만 recovery를 사용한다", () => {
  const result = readFileSync(
    new URL("../app/checkout/nice/fail/NiceCheckoutFailResult.tsx", import.meta.url),
    "utf8",
  );
  assert.match(result, /requiresPaymentCheck[\s\S]*주문 내역 확인/);
  assert.match(result, /readCheckoutRecoveryContext\(sessionStorage\)/);
  assert.match(result, /validateCartCheckoutSelection/);
  assert.match(result, /isCheckoutIntentExpired\(buyNowExpiresAt\)/);
});
