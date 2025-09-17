import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const must = req.cookies.get('force_pwd_change')?.value === '1';
  const { pathname } = req.nextUrl;

  // 예외 경로: 이미 변경 페이지이거나, API/정적 리소스 등은 건너뜀
  const isChangePage = pathname.startsWith('/account/password/change');
  const isApi = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/robots.txt') || pathname.startsWith('/sitemap.xml') || pathname.startsWith('/images') || pathname.startsWith('/fonts');

  if (must && !isChangePage && !isApi && !isStatic) {
    const url = req.nextUrl.clone();
    url.pathname = '/account/password/change';
    url.searchParams.set('reason', 'must');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // api, _next, 정적 등은 제외하고 나머지 모든 경로를 대상
    '/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|images|fonts).*)',
  ],
};
