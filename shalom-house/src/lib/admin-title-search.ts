export const ADMIN_TITLE_SEARCH_MAX_LENGTH = 100;

export function normalizeAdminTitleSearch(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, ADMIN_TITLE_SEARCH_MAX_LENGTH).trim() : "";
}

export function createAdminTitleSearchExpression(value: unknown): RegExp | undefined {
  const query = normalizeAdminTitleSearch(value);
  return query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : undefined;
}
