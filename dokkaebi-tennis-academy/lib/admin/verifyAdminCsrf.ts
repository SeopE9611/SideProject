import { NextResponse } from 'next/server';

type CsrfOk = { ok: true };
type CsrfFail = { ok: false; res: NextResponse };

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const CSRF_COOKIE_CANDIDATES = ['adminCsrfToken', 'csrfToken'];
const CSRF_HEADER_CANDIDATES = ['x-admin-csrf-token', 'x-csrf-token'];

function forbiddenResponse(): NextResponse {
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
}

function buildOriginAllowlist(): Set<string> {
  const allowlist = new Set<string>();

  // 1) 환경변수 allowlist(쉼표 구분)를 최우선으로 반영
  const rawAllowlist = process.env.ADMIN_CSRF_ORIGIN_ALLOWLIST ?? '';
  for (const item of rawAllowlist.split(',')) {
    const origin = item.trim();
    if (origin) allowlist.add(origin);
  }

  // 2) 운영/개발에서 자주 쓰는 기본 origin도 함께 허용
  const envOrigins = [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_BASE_URL].filter(Boolean) as string[];
  for (const origin of [...envOrigins, ...DEFAULT_DEV_ORIGINS]) {
    try {
      allowlist.add(new URL(origin).origin);
    } catch {
      // 잘못된 URL은 무시하고 다음 후보를 계속 처리
    }
  }

  return allowlist;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) continue;
    const key = rawKey.trim();
    const value = rawValue.join('=').trim();
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

function readCsrfTokenFromCookie(req: Request): string {
  const parsed = parseCookies(req.headers.get('cookie'));
  for (const key of CSRF_COOKIE_CANDIDATES) {
    const value = parsed[key];
    if (value) return value;
  }
  return '';
}

function readCsrfTokenFromHeader(req: Request): string {
  for (const key of CSRF_HEADER_CANDIDATES) {
    const value = req.headers.get(key);
    if (value) return value.trim();
  }
  return '';
}

export function verifyAdminCsrf(req: Request): CsrfOk | CsrfFail {
  const originAllowlist = buildOriginAllowlist();
  const requestOriginRaw = req.headers.get('origin')?.trim() ?? '';
  let requestOrigin = '';
  try {
    requestOrigin = requestOriginRaw ? new URL(requestOriginRaw).origin : '';
  } catch {
    requestOrigin = '';
  }

  // 관리자 변경 API는 허용된 Origin에서만 실행
  if (!requestOrigin || !originAllowlist.has(requestOrigin)) {
    return { ok: false, res: forbiddenResponse() };
  }

  // 더블 서브밋 쿠키 방식: Header 토큰과 Cookie 토큰이 동일해야 통과
  const headerToken = readCsrfTokenFromHeader(req);
  const cookieToken = readCsrfTokenFromCookie(req);

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return { ok: false, res: forbiddenResponse() };
  }

  return { ok: true };
}
