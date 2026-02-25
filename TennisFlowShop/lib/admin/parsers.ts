export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function safeArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  const record = asRecord(value);
  const candidates = [record.items, record.data, record.results, record.rows];
  const found = candidates.find(Array.isArray);
  return Array.isArray(found) ? (found as T[]) : [];
}
