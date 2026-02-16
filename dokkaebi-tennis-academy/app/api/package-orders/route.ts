import { NextResponse } from 'next/server';

/**
 * Legacy non-admin 경로 정책: 307 Temporary Redirect
 * - 관리자 전용 기능은 /api/admin/** 네임스페이스로만 수렴한다.
 * - 307을 사용해 메서드/바디를 유지한 채 점진 이관한다.
 */
function redirectToAdmin(req: Request, adminPath: string) {
  const url = new URL(req.url);
  const target = new URL(adminPath, url.origin);
  target.search = url.search;

  const res = NextResponse.redirect(target, 307);
  res.headers.set('Deprecation', 'true');
  res.headers.set('Sunset', 'Wed, 31 Dec 2026 14:59:59 GMT');
  res.headers.set('Link', `<${target.pathname}>; rel="successor-version"`);
  return res;
}

export async function GET(req: Request) {
  return redirectToAdmin(req, '/api/admin/package-orders');
}
