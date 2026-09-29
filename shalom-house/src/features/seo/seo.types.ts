export type PublicSitemapEntry = { slug: string; lastModified: string };

export const PUBLIC_SITEMAP_MAX_SECTION_ENTRIES = 10_000;

export function normalizePublicSitemapLimit(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return PUBLIC_SITEMAP_MAX_SECTION_ENTRIES;
  return Math.min(PUBLIC_SITEMAP_MAX_SECTION_ENTRIES, Math.max(1, Math.trunc(value)));
}
