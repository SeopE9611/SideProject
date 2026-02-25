import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { baseCookie } from '@/lib/cookieOptions';
import { ADMIN_CSRF_COOKIE_KEY } from '@/lib/admin/adminCsrf';

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

  // DB에서 실제 유저 정보 조회
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.sub) });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 탈퇴 계정: 401 + 쿠키 정리
  if (user.isDeleted) {
    const res = NextResponse.json({ message: 'unauthorized' }, { status: 401 });
    res.cookies.set('accessToken', '', { ...baseCookie, maxAge: 0 });
    res.cookies.set('refreshToken', '', { ...baseCookie, maxAge: 0 });
    res.cookies.set(ADMIN_CSRF_COOKIE_KEY, '', { ...baseCookie, httpOnly: false, maxAge: 0 });
    return res;
  }

  // 비활성 계정: 403 (accessToken만 비우는 쪽을 권장)
  if (user.isSuspended) {
    const res = NextResponse.json({ message: 'suspended' }, { status: 403 });
    res.cookies.set('accessToken', '', { ...baseCookie, maxAge: 0 });
    res.cookies.set(ADMIN_CSRF_COOKIE_KEY, '', { ...baseCookie, httpOnly: false, maxAge: 0 });
    return res;
  }

  // 새 액세스 토큰 발급
  const newAccessToken = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

  // 리프레시 토큰 재발급
  const newRefreshToken = jwt.sign({ sub: decoded.sub }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

  // 쿠키에 다시 심어서 만료시간 연장
  const res = NextResponse.json({ success: true }, { status: 200 });

  //  AccessToken 쿠키 갱신
  res.cookies.set('accessToken', newAccessToken, {
    ...baseCookie,
    maxAge: ACCESS_TOKEN_EXPIRES_IN,
  });

  //  RefreshToken 쿠키 갱신 (슬라이딩 로테이션)
  res.cookies.set('refreshToken', newRefreshToken, {
    ...baseCookie,
    maxAge: REFRESH_TOKEN_EXPIRES_IN,
  });

  // 관리자 refresh에는 CSRF 쿠키를 함께 재발급하고, 일반 유저는 기존 값을 제거한다.
  if (user.role === 'admin') {
    const adminCsrfToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
    res.cookies.set(ADMIN_CSRF_COOKIE_KEY, adminCsrfToken, {
      ...baseCookie,
      httpOnly: false,
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
    });
  } else {
    res.cookies.set(ADMIN_CSRF_COOKIE_KEY, '', {
      ...baseCookie,
      httpOnly: false,
      maxAge: 0,
    });
  }

  return res;
}
