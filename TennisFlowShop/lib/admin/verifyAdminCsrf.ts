import { NextResponse } from 'next/server';
import { ADMIN_CSRF_COOKIE_KEY, ADMIN_CSRF_HEADER_KEY } from '@/lib/admin/adminCsrf';

type CsrfOk = { ok: true };
type CsrfFail = { ok: false; res: NextResponse };

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

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
  return parsed[ADMIN_CSRF_COOKIE_KEY] || '';
}

function readCsrfTokenFromHeader(req: Request): string {
  return req.headers.get(ADMIN_CSRF_HEADER_KEY)?.trim() ?? '';
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

  // 더블 서브밋 쿠키 방식: Header 토큰과 Cookie 토큰이 모두 존재하고 동일해야 통과
  const headerToken = readCsrfTokenFromHeader(req);
  const cookieToken = readCsrfTokenFromCookie(req);

  // (1) 토큰 미발급 상태는 즉시 차단
  if (!headerToken || !cookieToken) {
    return { ok: false, res: forbiddenResponse() };
  }

  // (2) 토큰 불일치 상태도 즉시 차단
  if (headerToken !== cookieToken) {
    return { ok: false, res: forbiddenResponse() };
  }

  // (3) 발급 + 헤더 일치 시에만 통과
  return { ok: true };
}
