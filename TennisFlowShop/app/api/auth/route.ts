export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const real = process.env.AUTH_PASSWORD;

    if (!real) {
      return NextResponse.json({ ok: false, message: '서버 비번 미설정' }, { status: 500 });
    }
    if (password !== real) {
      return NextResponse.json({ ok: false, message: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const isProd = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });

    res.cookies.set({
      name: 'dkb_auth',
      value: '1',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd, // 로컬 false, 배포 true
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    return NextResponse.json({ ok: false, message: '요청 형식 오류' }, { status: 400 });
  }
}
