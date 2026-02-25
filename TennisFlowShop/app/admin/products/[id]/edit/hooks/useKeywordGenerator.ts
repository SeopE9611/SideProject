export function createSearchKeywords(name: string, brand: string) {
  const base = `${name ?? ''} ${brand ?? ''}`.trim();
  if (!base) return null;

  const tokens = base
    .split(/[\s,()/+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  return Array.from(new Set(tokens.map((t) => t.toLowerCase())));
}
