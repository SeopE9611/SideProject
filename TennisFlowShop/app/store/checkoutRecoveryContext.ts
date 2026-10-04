import {
  getCheckoutIntentExpiresAt,
  isCheckoutIntentExpired,
} from "@/app/store/checkoutIntentPersistence";

export const CHECKOUT_RECOVERY_CONTEXT_KEY = "checkout.nice.recovery.v1";

export type CheckoutRecoveryContext = {
  href: string;
  expiresAt: number;
};

export const isSafeCheckoutRecoveryHref = (href: unknown): href is string => {
  if (typeof href !== "string" || !href.startsWith("/checkout?")) return false;

  try {
    const url = new URL(href, "https://checkout.local");
    if (url.origin !== "https://checkout.local" || url.pathname !== "/checkout") return false;

    const isBuyNow =
      url.searchParams.get("mode") === "buynow" && !url.searchParams.has("source");
    const isCartSelection =
      url.searchParams.get("source") === "cart-selection" && !url.searchParams.has("mode");
    return isBuyNow || isCartSelection;
  } catch {
    return false;
  }
};

export const saveCheckoutRecoveryContext = (
  storage: Pick<Storage, "setItem">,
  href: string,
  now = Date.now(),
) => {
  if (!isSafeCheckoutRecoveryHref(href)) return false;
  storage.setItem(
    CHECKOUT_RECOVERY_CONTEXT_KEY,
    JSON.stringify({ href, expiresAt: getCheckoutIntentExpiresAt(now) }),
  );
  return true;
};

export const readCheckoutRecoveryContext = (
  storage: Pick<Storage, "getItem" | "removeItem">,
  now = Date.now(),
): CheckoutRecoveryContext | null => {
  const clear = () => storage.removeItem(CHECKOUT_RECOVERY_CONTEXT_KEY);

  try {
    const raw = storage.getItem(CHECKOUT_RECOVERY_CONTEXT_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      clear();
      return null;
    }
    const context = value as Partial<CheckoutRecoveryContext>;
    if (!isSafeCheckoutRecoveryHref(context.href) || isCheckoutIntentExpired(context.expiresAt, now)) {
      clear();
      return null;
    }
    return context as CheckoutRecoveryContext;
  } catch {
    clear();
    return null;
  }
};

export const clearCheckoutRecoveryContext = (storage: Pick<Storage, "removeItem">) => {
  storage.removeItem(CHECKOUT_RECOVERY_CONTEXT_KEY);
};
