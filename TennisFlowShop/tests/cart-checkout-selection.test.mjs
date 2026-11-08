import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const TTL_MS = 30 * 60 * 1000;
const selectionModule = compileTsModule("app/store/cartCheckoutSelection.ts", {
  "@/app/store/checkoutIntentPersistence": {
    getCheckoutIntentExpiresAt: (now = Date.now()) => now + TTL_MS,
    isCheckoutIntentExpired: (expiresAt, now = Date.now()) =>
      typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= now,
  },
});

const {
  CART_CHECKOUT_SELECTION_KEY,
  LEGACY_CART_CHECKOUT_SELECTION_KEY,
  clearCartCheckoutSelectionStorage,
  createCartCheckoutSelection,
  getCartLineKey,
  getCartSignature,
  parseCartCheckoutSelection,
  removeSelectedCartItems,
  saveCartCheckoutSelection,
  validateCartCheckoutSelection,
} = selectionModule;

const baseCart = [
  {
    id: "string-1",
    kind: "product",
    quantity: 2,
    selectedGauge: "1.25",
    selectedColor: "black",
    stock: 5,
    name: "스트링",
    price: 10_000,
  },
  { id: "racket-1", kind: "racket", quantity: 1, stock: 2, name: "라켓", price: 200_000 },
];

const rawSelection = (cart = baseCart, selected = [baseCart[0]], now = 1_000) =>
  JSON.stringify(createCartCheckoutSelection(cart, selected, now));

test("cart selection은 생성 시점부터 30분 동안만 유효하다", () => {
  const payload = createCartCheckoutSelection(baseCart, [baseCart[0]], 1_000);

  assert.equal(payload.expiresAt, 1_000 + TTL_MS);
  assert.ok(validateCartCheckoutSelection(JSON.stringify(payload), baseCart, payload.expiresAt - 1));
  assert.equal(validateCartCheckoutSelection(JSON.stringify(payload), baseCart, payload.expiresAt), null);
  assert.equal(validateCartCheckoutSelection(JSON.stringify({ ...payload, expiresAt: null }), baseCart), null);
});

test("cart signature는 순서와 stock을 제외하고 cart identity 변경을 감지한다", () => {
  const signature = getCartSignature(baseCart);
  assert.equal(getCartSignature([...baseCart].reverse()), signature);
  assert.equal(getCartSignature(baseCart.map((item) => ({ ...item, stock: 999 }))), signature);

  const changes = [
    [...baseCart, { id: "added", kind: "product", quantity: 1 }],
    [baseCart[0]],
    [{ ...baseCart[0], quantity: 3 }, baseCart[1]],
    [{ ...baseCart[0], selectedGauge: "1.30" }, baseCart[1]],
    [{ ...baseCart[0], selectedColor: "white" }, baseCart[1]],
    [{ ...baseCart[0], kind: "racket" }, baseCart[1]],
  ];
  changes.forEach((cart) => assert.notEqual(getCartSignature(cart), signature));
});

test("payload schema와 전체 selected line 존재 여부를 엄격히 검증한다", () => {
  assert.ok(validateCartCheckoutSelection(rawSelection(), baseCart, 1_001));
  assert.equal(parseCartCheckoutSelection("not-json"), null);
  assert.equal(parseCartCheckoutSelection(JSON.stringify([getCartLineKey(baseCart[0])])), null);
  assert.equal(
    parseCartCheckoutSelection(
      JSON.stringify({
        schemaVersion: 2,
        lineKeys: [],
        cartSignature: getCartSignature(baseCart),
        expiresAt: 10_000,
      }),
    ),
    null,
  );

  const selectedBoth = rawSelection(baseCart, baseCart);
  assert.equal(validateCartCheckoutSelection(selectedBoth, [baseCart[0]], 1_001), null);
});

test("storage 저장과 정리는 v2와 legacy v1을 함께 관리한다", () => {
  const values = new Map([[LEGACY_CART_CHECKOUT_SELECTION_KEY, '["legacy"]']]);
  const storage = {
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const selection = createCartCheckoutSelection(baseCart, [baseCart[0]], 1_000);

  saveCartCheckoutSelection(storage, selection);
  assert.ok(values.has(CART_CHECKOUT_SELECTION_KEY));
  assert.equal(values.has(LEGACY_CART_CHECKOUT_SELECTION_KEY), false);

  values.set(LEGACY_CART_CHECKOUT_SELECTION_KEY, '["legacy"]');
  clearCartCheckoutSelectionStorage(storage);
  assert.equal(values.size, 0);
});

test("checkout과 success는 invalid selection을 full cart 처리하지 않는다", () => {
  const checkout = readFileSync(new URL("../app/checkout/page.tsx", import.meta.url), "utf8");
  const cleanup = readFileSync(
    new URL("../app/checkout/success/_components/ClearCartOnMount.tsx", import.meta.url),
    "utf8",
  );

  assert.match(checkout, /isCartSelectionSource\s*\? selectedCartItems\s*: \[\]/);
  assert.match(cleanup, /if \(selection\)/);
  assert.match(cleanup, /items: removeSelectedCartItems\(cartItems, selection\)/);
  assert.doesNotMatch(cleanup, /\bclearCart\s*[;(=]/);
  assert.match(cleanup, /clearBuyNow\(\)/);
  assert.match(cleanup, /clearPdpBundle\(\)/);
});

test("success cleanup은 valid selection만 제거하고 invalid payload에서는 cart를 보존한다", () => {
  const valid = validateCartCheckoutSelection(rawSelection(), baseCart, 1_001);
  assert.deepEqual(removeSelectedCartItems(baseCart, valid), [baseCart[1]]);

  const invalidSelections = [
    null,
    validateCartCheckoutSelection(null, baseCart, 1_001),
    validateCartCheckoutSelection("malformed", baseCart, 1_001),
    validateCartCheckoutSelection(rawSelection(), baseCart, 1_000 + TTL_MS),
    validateCartCheckoutSelection(rawSelection(), [{ ...baseCart[0], quantity: 3 }, baseCart[1]], 1_001),
  ];
  invalidSelections.forEach((selection) => {
    assert.strictEqual(removeSelectedCartItems(baseCart, selection), baseCart);
  });
});

test("checkout 검증 effect는 초기 빈 스냅샷을 보존하고 복원 후에만 검증한다", () => {
  const checkout = readFileSync(new URL("../app/checkout/page.tsx", import.meta.url), "utf8");
  // 실제 effect 본문을 재사용해 hydration 첫 렌더와 StrictMode 재실행을 확인한다.
  const effect = checkout.match(/useEffect\(\(\) => \{\n( {4}if \(mode === "buynow" \|\| !isCartSelectionSource\)[\s\S]*?)\n {2}\}, \[cartItems, cartSelectionValidationVersion, hasCartHydrated, isCartSelectionSource, mode\]\)/);
  assert.ok(effect);
  assert.match(checkout, /\[hasCartHydrated, setHasCartHydrated\] = useState\(false\)/);
  assert.match(checkout, /onFinishHydration\(\(\) => setHasCartHydrated\(true\)\)/);
  assert.match(checkout, /setHasCartHydrated\(useCartStore\.persist\.hasHydrated\(\)\)/);

  const values = new Map([[CART_CHECKOUT_SELECTION_KEY, rawSelection()]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
  };
  let selected = null;
  let toasts = 0;
  let expire;
  const toastRef = { current: false };
  const run = (hasCartHydrated, cartItems, now = 1_001) => {
    const bindings = {
      mode: null,
      isCartSelectionSource: true,
      hasCartHydrated,
      cartItems,
      sessionStorage: storage,
      CART_CHECKOUT_SELECTION_KEY,
      clearCartCheckoutSelectionStorage,
      validateCartCheckoutSelection: (raw, items) => validateCartCheckoutSelection(raw, items, now),
      setSelectedLineKeys: (keys) => { selected = keys; },
      cartSelectionToastShownRef: toastRef,
      showErrorToast: () => { toasts += 1; },
      setCartSelectionValidationVersion: () => {},
      Date: { now: () => now },
      window: {
        setTimeout: (callback, delay) => { expire = { callback, delay }; return 1; },
        clearTimeout: () => {},
      },
    };
    return new Function(...Object.keys(bindings), effect[1])(...Object.values(bindings));
  };

  run(false, []);
  run(false, []);
  assert.equal(values.get(CART_CHECKOUT_SELECTION_KEY), rawSelection());
  assert.equal(selected, null);
  assert.equal(toasts, 0);
  const cleanup = run(true, baseCart);
  assert.deepEqual(selected, [getCartLineKey(baseCart[0])]);
  assert.deepEqual(baseCart.filter((item) => selected.includes(getCartLineKey(item))), [baseCart[0]]);
  assert.equal(expire.delay, 1_000 + TTL_MS - 1_001);
  cleanup();
  run(true, baseCart); // StrictMode 재실행도 정상 선택 정보를 보존한다.
  assert.equal(values.size, 1);

  for (const [cart, now] of [
    [baseCart, 1_000 + TTL_MS],
    [[baseCart[1]], 1_001],
    [[{ ...baseCart[0], quantity: 3 }, baseCart[1]], 1_001],
    [[{ ...baseCart[0], selectedGauge: "1.30" }, baseCart[1]], 1_001],
    [[{ ...baseCart[0], selectedColor: "white" }, baseCart[1]], 1_001],
  ]) {
    values.set(CART_CHECKOUT_SELECTION_KEY, rawSelection());
    run(true, cart, now);
    assert.deepEqual(selected, []);
    assert.equal(values.size, 0);
  }
  assert.equal(toasts, 1);
});
