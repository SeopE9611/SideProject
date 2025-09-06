import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { baseCookie } from '@/lib/cookieOptions';

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

  return res;
}
