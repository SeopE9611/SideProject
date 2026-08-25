export const PUBLIC_NEWS_DEFAULT_LIMIT = 20;
export const PUBLIC_NEWS_MINIMUM_LIMIT = 1;
export const PUBLIC_NEWS_MAXIMUM_LIMIT = 50;

export function normalizePublicNewsLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return PUBLIC_NEWS_DEFAULT_LIMIT;
  }

  return Math.min(
    PUBLIC_NEWS_MAXIMUM_LIMIT,
    Math.max(PUBLIC_NEWS_MINIMUM_LIMIT, Math.trunc(limit)),
  );
}

export const ADMIN_NEWS_PAGE_SIZE = 20;
export const ADMIN_NEWS_MAXIMUM_PAGE = 10_000;

export function normalizeAdminNewsPage(value: unknown): number {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    return 1;
  }

  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1) {
    return 1;
  }

  return Math.min(page, ADMIN_NEWS_MAXIMUM_PAGE);
}
