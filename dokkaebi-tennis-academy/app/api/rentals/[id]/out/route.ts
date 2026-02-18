import { NextResponse } from 'next/server';

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
  return redirectToAdmin(req, `/api/admin/rentals/${id}/out`);
}
