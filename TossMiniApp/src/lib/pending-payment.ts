export const PENDING_PAYMENT_STORAGE_KEY = "dokkaebitennis:apps-payment-pending:v1";
const PENDING_PAYMENT_STORAGE_PROBE_KEY = "dokkaebitennis:apps-payment-pending:probe";

export type PendingAppsPayment = { attemptId: string; authorizedAt: string };

export function readPendingAppsPayment(): PendingAppsPayment | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY) ?? "null");
    if (typeof value !== "object" || value === null || Object.keys(value).sort().join(",") !== "attemptId,authorizedAt") return null;
    const marker = value as Record<string, unknown>;
    if (typeof marker.attemptId !== "string" || !marker.attemptId || typeof marker.authorizedAt !== "string" || !Number.isFinite(Date.parse(marker.authorizedAt))) return null;
    return { attemptId: marker.attemptId, authorizedAt: marker.authorizedAt };
  } catch { return null; }
}

export function savePendingAppsPayment(attemptId: string) {
  localStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify({ attemptId, authorizedAt: new Date().toISOString() }));
}

export function canStorePendingAppsPayment(): boolean {
  try {
    localStorage.setItem(PENDING_PAYMENT_STORAGE_PROBE_KEY, "1");
    localStorage.removeItem(PENDING_PAYMENT_STORAGE_PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearPendingAppsPayment() {
  localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
}
