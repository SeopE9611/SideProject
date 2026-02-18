export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { ADMIN_CSRF_COOKIE_KEY } from '@/lib/admin/adminCsrf';
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: 'dkb_auth', value: '', path: '/', maxAge: 0 });
  res.cookies.set({ name: ADMIN_CSRF_COOKIE_KEY, value: '', path: '/', httpOnly: false, maxAge: 0 });
  return res;
}
