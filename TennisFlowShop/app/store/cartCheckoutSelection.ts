import type { CartItem } from "@/app/store/cartStore";
import {
  getCheckoutIntentExpiresAt,
  isCheckoutIntentExpired,
} from "@/app/store/checkoutIntentPersistence";

export const CART_CHECKOUT_SELECTION_KEY = "cart.checkout.selection.v2";
export const LEGACY_CART_CHECKOUT_SELECTION_KEY = "cart.checkout.selectedLineKeys.v1";

export type CartCheckoutSelection = {
  schemaVersion: 2;
  lineKeys: string[];
  cartSignature: string;
  expiresAt: number;
};

type CartLineIdentity = Pick<
  CartItem,
  "id" | "kind" | "quantity" | "selectedGauge" | "selectedColor"
>;

const normalizeKind = (kind: CartItem["kind"]) => kind ?? "product";

export const getCartLineKey = (
  item: Pick<CartItem, "id" | "kind" | "selectedGauge" | "selectedColor">,
) =>
  JSON.stringify([
    item.id,
    normalizeKind(item.kind),
    item.selectedGauge ?? "",
    item.selectedColor ?? "",
  ]);

export const getCartSignature = (items: CartLineIdentity[]) =>
  JSON.stringify(
    items
      .map((item) => [
        item.id,
        normalizeKind(item.kind),
        item.selectedGauge ?? "",
        item.selectedColor ?? "",
        item.quantity,
      ])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );

export const createCartCheckoutSelection = (
  cartItems: CartLineIdentity[],
  selectedItems: CartLineIdentity[],
  now = Date.now(),
): CartCheckoutSelection | null => {
  const lineKeys = selectedItems.map(getCartLineKey);
  if (lineKeys.length === 0) return null;

  return {
    schemaVersion: 2,
    lineKeys,
    cartSignature: getCartSignature(cartItems),
    expiresAt: getCheckoutIntentExpiresAt(now),
  };
};

export const parseCartCheckoutSelection = (raw: string | null): CartCheckoutSelection | null => {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const candidate = value as Partial<CartCheckoutSelection>;
    if (
      candidate.schemaVersion !== 2 ||
      !Array.isArray(candidate.lineKeys) ||
      candidate.lineKeys.length === 0 ||
      candidate.lineKeys.some((key) => typeof key !== "string" || key.length === 0) ||
      new Set(candidate.lineKeys).size !== candidate.lineKeys.length ||
      typeof candidate.cartSignature !== "string" ||
      candidate.cartSignature.length === 0 ||
      typeof candidate.expiresAt !== "number" ||
      !Number.isFinite(candidate.expiresAt)
    ) {
      return null;
    }

    return candidate as CartCheckoutSelection;
  } catch {
    return null;
  }
};

export const validateCartCheckoutSelection = (
  raw: string | null,
  cartItems: CartLineIdentity[],
  now = Date.now(),
): CartCheckoutSelection | null => {
  const selection = parseCartCheckoutSelection(raw);
  if (!selection || isCheckoutIntentExpired(selection.expiresAt, now)) return null;
  if (selection.cartSignature !== getCartSignature(cartItems)) return null;

  const currentLineKeys = new Set(cartItems.map(getCartLineKey));
  if (!selection.lineKeys.every((lineKey) => currentLineKeys.has(lineKey))) return null;

  return selection;
};

export const removeSelectedCartItems = (
  cartItems: CartItem[],
  selection: CartCheckoutSelection | null,
) => {
  if (!selection) return cartItems;

  const selectedLineKeys = new Set(selection.lineKeys);
  return cartItems.filter((item) => !selectedLineKeys.has(getCartLineKey(item)));
};

export const clearCartCheckoutSelectionStorage = (storage: Pick<Storage, "removeItem">) => {
  storage.removeItem(CART_CHECKOUT_SELECTION_KEY);
  storage.removeItem(LEGACY_CART_CHECKOUT_SELECTION_KEY);
};

export const saveCartCheckoutSelection = (
  storage: Pick<Storage, "setItem" | "removeItem">,
  selection: CartCheckoutSelection,
) => {
  storage.setItem(CART_CHECKOUT_SELECTION_KEY, JSON.stringify(selection));
  storage.removeItem(LEGACY_CART_CHECKOUT_SELECTION_KEY);
};
