import { NextResponse } from 'next/server';

/**
 * Legacy non-admin 경로 정책: 307 Temporary Redirect
 * - 패스 상태 변경(관리자 변경성)은 /api/admin/** 에서만 처리한다.
 * - 307을 사용해 POST body를 손실 없이 이전한다.
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return redirectToAdmin(req, `/api/admin/package-orders/${id}/pass-status`);
}
