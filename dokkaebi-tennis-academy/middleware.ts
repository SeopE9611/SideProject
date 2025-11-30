import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getOrCreateReqId(req: NextRequest) {
  // 프록시/클라이언트가 보낸 ID가 있으면 재사용
  const fromClient = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  if (fromClient) return fromClient;
  // Node 18+ : 랜덤 UUID
  return crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const must = req.cookies.get('force_pwd_change')?.value === '1';
  const { pathname } = req.nextUrl;

  // 요청ID 전파
  const reqId = getOrCreateReqId(req);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', reqId);

  const isChangePage = pathname.startsWith('/account/password/change');
  const isApi = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/robots.txt') || pathname.startsWith('/sitemap.xml') || pathname.startsWith('/images') || pathname.startsWith('/fonts');

  if (must && !isChangePage && !isApi && !isStatic) {
    const url = req.nextUrl.clone();
    url.pathname = '/account/password/change';
    url.searchParams.set('reason', 'must');
    const res = NextResponse.redirect(url);
    res.headers.set('x-request-id', reqId); // 응답에도 넣어줌
    return res;
  }

  // 요청 헤더를 교체해 다음 단계(라우트 핸들러)로 전달
  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  // 응답 헤더에도 동일 값 세팅
  res.headers.set('x-request-id', reqId);
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|images|fonts).*)'],
};
