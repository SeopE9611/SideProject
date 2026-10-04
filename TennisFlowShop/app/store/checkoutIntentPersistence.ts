export const CHECKOUT_INTENT_TTL_MS = 30 * 60 * 1000;

export const getCheckoutIntentExpiresAt = (now = Date.now()) => now + CHECKOUT_INTENT_TTL_MS;

export const isCheckoutIntentExpired = (expiresAt: unknown, now = Date.now()) =>
  typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= now;
