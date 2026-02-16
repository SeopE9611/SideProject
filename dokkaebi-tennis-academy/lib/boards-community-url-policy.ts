type UrlValidationFailureReason = 'invalid_url' | 'invalid_scheme' | 'invalid_host' | 'invalid_path';

export const BOARD_ASSET_ALLOWED_HOSTS = new Set<string>(['cwzpxxahtayoyqqskmnt.supabase.co']);
export const BOARD_ASSET_ALLOWED_PATH_PREFIXES = ['/storage/v1/object/public/tennis-images/'] as const;

export type UrlValidationResult =
  | { ok: true }
  | { ok: false; reason: UrlValidationFailureReason };

/**
 * boards/community 첨부 URL 공통 정책
 * - HTTPS만 허용 (javascript:, data:, http: 차단)
 * - 허용 호스트/경로 prefix 화이트리스트 통과 필수
 */
export function validateBoardAssetUrl(url: unknown): UrlValidationResult {
  if (typeof url !== 'string') {
    return { ok: false, reason: 'invalid_url' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'invalid_scheme' };
  }

  if (!BOARD_ASSET_ALLOWED_HOSTS.has(parsed.hostname)) {
    return { ok: false, reason: 'invalid_host' };
  }

  const hasAllowedPath = BOARD_ASSET_ALLOWED_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix));
  if (!hasAllowedPath) {
    return { ok: false, reason: 'invalid_path' };
  }

  return { ok: true };
}

