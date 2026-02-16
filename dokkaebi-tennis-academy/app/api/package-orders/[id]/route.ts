import { NextResponse } from 'next/server';

/**
 * Legacy non-admin 경로 정책: 307 Temporary Redirect
 * - 관리자 변경/조회 흐름은 /api/admin/package-orders/:id 로 통일한다.
 * - 307으로 메서드(PATCH/GET)와 요청 바디를 보존한다.
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return redirectToAdmin(request, `/api/admin/package-orders/${id}`);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return redirectToAdmin(request, `/api/admin/package-orders/${id}`);
}
