export function normalizeReviewSummary(value: unknown): { average: number; count: number } {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const average = Number(record.average ?? 0);
  const count = Number(record.count ?? 0);
  return {
    average: Number.isFinite(average) ? average : 0,
    count: Number.isFinite(count) ? Math.max(0, count) : 0,
  };
}
