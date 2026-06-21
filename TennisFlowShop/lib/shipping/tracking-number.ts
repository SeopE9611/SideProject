export function normalizeTrackingNumber(value?: string | null): string {
  return String(value ?? "").replace(/[\s-]+/g, "").replace(/\D+/g, "");
}

export function isValidTrackingNumberLength(value?: string | null): boolean {
  const normalized = normalizeTrackingNumber(value);
  return normalized.length >= 9 && normalized.length <= 20;
}
