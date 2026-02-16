import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';

type ProxyMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export async function proxyToLegacyAdminRoute(req: Request, legacyPath: string, method: ProxyMethod) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  if (method !== 'GET') {
    const csrf = verifyAdminCsrf(req);
    if (!csrf.ok) return csrf.res;
  }

  const sourceUrl = new URL(req.url);
  const targetUrl = new URL(legacyPath, sourceUrl.origin);
  targetUrl.search = sourceUrl.search;

  const headers = new Headers();
  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const res = await fetch(targetUrl, {
    method,
    headers,
    body: method === 'GET' ? undefined : await req.text(),
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json; charset=utf-8',
    },
  });
}
