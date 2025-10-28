// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getOrCreateReqId(req: NextRequest) {
  const fromClient = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  if (fromClient) return fromClient;
  return crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 정적 파일/내부 파일
  const isStatic =
    pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/robots.txt') || pathname.startsWith('/sitemap.xml') || pathname.startsWith('/images') || pathname.startsWith('/fonts') || /\.(.*)$/.test(pathname);

  // ✅ 인증 페이지는 예외
  const isAuthPage = pathname.startsWith('/auth');

  // ✅ /api는 전부 제외(여기서 끝) — /api/auth가 절대 막히지 않도록
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // ✅ 개발자 게이트: dkb_auth 없으면 /auth로 redirect
  const authed = req.cookies.get('dkb_auth')?.value === '1';
  if (!authed && !isStatic && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirect', pathname || '/');
    return NextResponse.redirect(url);
  }

  // (기존 요청ID 전파/기타 로직 유지)
  const reqId = getOrCreateReqId(req);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', reqId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', reqId);
  res.headers.set('x-robots-tag', 'noindex, nofollow');
  return res;
}

// ✅ 매처는 안전한 기본형으로 (api 제외)
export const config = {
  matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|images|fonts).*)'],
};
