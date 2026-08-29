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

export const PUBLIC_NEWS_SEARCH_DEFAULT_PAGE_SIZE = 8;
export const PUBLIC_NEWS_SEARCH_MAXIMUM_PAGE_SIZE = 20;
export const PUBLIC_NEWS_SEARCH_QUERY_MAX_LENGTH = 100;

export function normalizePublicNewsSearchQuery(value?: string): string {
  return typeof value === "string"
    ? value.trim().slice(0, PUBLIC_NEWS_SEARCH_QUERY_MAX_LENGTH)
    : "";
}

export function normalizePublicNewsPage(value?: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 1;
}

export function normalizePublicNewsPageSize(value?: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return PUBLIC_NEWS_SEARCH_DEFAULT_PAGE_SIZE;
  }

  return Math.min(PUBLIC_NEWS_SEARCH_MAXIMUM_PAGE_SIZE, Math.max(1, value));
}

export function resolvePublicNewsPage(page: number, totalPages: number): number {
  return totalPages === 0 ? 1 : Math.min(page, totalPages);
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
