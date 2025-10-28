import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getOrCreateReqId(req: NextRequest) {
  const fromClient = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  if (fromClient) return fromClient;
  return crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const must = req.cookies.get('force_pwd_change')?.value === '1';

  // 정적/내부 경로 예외 (내부에서 예외 처리)
  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') || // /favicon.ico 포함
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    /\.(.*)$/.test(pathname); // 확장자 파일

  // [변경] 인증 페이지: /auth 로 변경
  const isAuthPage = pathname.startsWith('/auth');
  const isApi = pathname.startsWith('/api');

  // [ADD] 개발자 게이트: 인증 쿠키 없으면 /auth 로 "redirect"
  const authed = req.cookies.get('dkb_auth')?.value === '1';
  if (!authed && !isStatic && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirect', pathname || '/');
    return NextResponse.redirect(url); // ← rewrite 대신 redirect로 확실히 확인
  }

  // 요청ID 전파
  const reqId = getOrCreateReqId(req);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', reqId);

  // 기존 비번 강제변경 플로우 (인증/정적/API는 제외)
  const isChangePage = pathname.startsWith('/account/password/change');
  if (must && !isChangePage && !isApi && !isStatic && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/account/password/change';
    url.searchParams.set('reason', 'must');
    const res = NextResponse.redirect(url);
    res.headers.set('x-request-id', reqId);
    return res;
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', reqId);
  res.headers.set('x-robots-tag', 'noindex, nofollow'); // 임시: 크롤러 차단
  return res;
}

// [변경] 우선 전부 태운 뒤 내부 if로 예외 분기
export const config = {
  matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|images|fonts).*)'],
};
