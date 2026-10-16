export function normalizeAdminListPage(value: unknown): number {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) return 1;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return Math.min(10000, page);
}
