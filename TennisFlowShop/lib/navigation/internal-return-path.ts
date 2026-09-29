const DEFAULT_INTERNAL_RETURN_PATH = "/cart";
const INTERNAL_BASE_URL = "https://internal.invalid";
function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
}

export function normalizeInternalReturnPath(
  value: string | null | undefined,
  fallback = DEFAULT_INTERNAL_RETURN_PATH,
): string {
  const candidate = String(value ?? "").trim();

  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    hasControlCharacter(candidate)
  ) {
    return fallback;
  }

  const pathPart = candidate.split(/[?#]/, 1)[0];
  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(pathPart);
  } catch {
    return fallback;
  }

  if (
    !decodedPath.startsWith("/") ||
    decodedPath.startsWith("//") ||
    decodedPath.includes("\\") ||
    hasControlCharacter(decodedPath)
  ) {
    return fallback;
  }

  try {
    const base = new URL(INTERNAL_BASE_URL);
    const resolved = new URL(candidate, base);

    if (resolved.origin !== base.origin) {
      return fallback;
    }

    const normalized = `${resolved.pathname}${resolved.search}${resolved.hash}`;

    if (
      !normalized.startsWith("/") ||
      normalized.startsWith("//") ||
      normalized.includes("\\") ||
      hasControlCharacter(normalized)
    ) {
      return fallback;
    }

    return normalized;
  } catch {
    return fallback;
  }
}
