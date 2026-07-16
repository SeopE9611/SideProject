const DEFAULT_INTERNAL_RETURN_PATH = "/cart";
const INTERNAL_BASE_URL = "https://internal.invalid";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

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
    CONTROL_CHARACTER_PATTERN.test(candidate)
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
    CONTROL_CHARACTER_PATTERN.test(decodedPath)
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
      CONTROL_CHARACTER_PATTERN.test(normalized)
    ) {
      return fallback;
    }

    return normalized;
  } catch {
    return fallback;
  }
}
