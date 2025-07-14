import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'Refresh Token 없음' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as jwt.JwtPayload;
  } catch {
    return NextResponse.json({ error: 'Refresh Token 만료 또는 변조됨' }, { status: 403 });
  }

  // 새 액세스 토큰 발급
  const newAccessToken = jwt.sign({ sub: decoded.sub, email: decoded.email, role: decoded.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

  // 리프레시 토큰 재발급
  const newRefreshToken = jwt.sign({ sub: decoded.sub }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

  // 쿠키에 다시 심어서 만료시간 연장
  const res = NextResponse.json({ accessToken: newAccessToken }, { status: 200 });
  // accessToken 쿠키 갱신
  res.cookies.set('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_EXPIRES_IN,
  });
  // refreshToken 슬라이딩 로테이션(원하면)
  res.cookies.set('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_EXPIRES_IN,
  });

  return res;
}
