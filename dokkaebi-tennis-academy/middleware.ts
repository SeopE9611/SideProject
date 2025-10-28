import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getOrCreateReqId(req: NextRequest) {
  const fromClient = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  if (fromClient) return fromClient;
  return crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api')) return NextResponse.next();

  const isStatic =
    pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/robots.txt') || pathname.startsWith('/sitemap.xml') || pathname.startsWith('/images') || pathname.startsWith('/fonts') || /\.(.*)$/.test(pathname);

  const isAuthPage = pathname.startsWith('/auth');

  const authed = req.cookies.get('dkb_auth')?.value === '1';
  if (!authed && !isStatic && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirect', pathname || '/');
    return NextResponse.redirect(url);
  }

  const reqId = getOrCreateReqId(req);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', reqId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', reqId);
  res.headers.set('x-robots-tag', 'noindex, nofollow'); // 개발기간 크롤러 차단
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|images|fonts).*)'],
};
