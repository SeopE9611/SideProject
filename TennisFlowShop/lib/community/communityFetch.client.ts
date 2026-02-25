'use client';

/**
 * 게시판/커뮤니티 mutating API용 fetch 래퍼
 *
 * 서버 verifyCommunityCsrf() 규칙:
 * - Cookie:  communityCsrfToken
 * - Header:  x-community-csrf-token
 * - 두 값이 모두 존재 + 서로 동일해야 통과
 *
 * 해결:
 * - 클라이언트가 쿠키를 먼저 생성/보장
 * - POST/PATCH/PUT/DELETE 요청에 CSRF 헤더 자동 주입
 */

const COMMUNITY_CSRF_COOKIE = 'communityCsrfToken';
const COMMUNITY_CSRF_HEADER = 'x-community-csrf-token';

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const kv of cookies) {
    const idx = kv.indexOf('=');
    if (idx < 0) continue;
    const k = decodeURIComponent(kv.slice(0, idx));
    if (k !== name) continue;
    return decodeURIComponent(kv.slice(idx + 1));
  }
  return '';
}

function writeCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 30) {
  if (typeof document === 'undefined') return;

  // localhost(http)에서도 동작해야 하므로 https일 때만 Secure
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export function ensureCommunityCsrfToken(): string {
  const existing = readCookie(COMMUNITY_CSRF_COOKIE);
  if (existing) return existing;

  const token = generateToken();
  writeCookie(COMMUNITY_CSRF_COOKIE, token);
  return token;
}

function isMutatingMethod(method?: string) {
  const m = (method ?? 'GET').toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

export async function communityFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? undefined);

  // mutating 요청에만 CSRF 헤더 주입
  if (isMutatingMethod(init.method)) {
    const token = ensureCommunityCsrfToken();
    headers.set(COMMUNITY_CSRF_HEADER, token);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });
}
