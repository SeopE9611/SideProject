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

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: 'dkb_auth',
      value: '1',
      httpOnly: true,
      sameSite: 'lax',
      secure: true, // Vercel(HTTPS) 기준
      path: '/',
      maxAge: 60 * 60 * 12, // 12h
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, message: '요청 형식 오류' }, { status: 400 });
  }
}
