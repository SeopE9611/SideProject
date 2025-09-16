import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserByEmail, verifyPassword } from '@/lib/user-service';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { getDb } from '@/lib/mongodb';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { baseCookie } from '@/lib/cookieOptions';

// // JWT 비밀 키 불러오기 (환경 변수에서 설정)
// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

// // 토큰 만료 시간 설정
// const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // AccessToken: 1시간 (3600초)
// const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // RefreshToken: 7일

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  // 필수 입력값 확인
  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  // 사용자 조회 + 비밀번호 검증
  const user = await getUserByEmail(email);
  const isValid = user?.hashedPassword && (await verifyPassword(password, user.hashedPassword));

  if (!isValid) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
  }

  if (user.isDeleted) return NextResponse.json({ error: '탈퇴한 계정입니다.' }, { status: 403 });
  if (user.isSuspended) return NextResponse.json({ error: '비활성화된 계정입니다.' }, { status: 403 });

  // AccessToken 생성 (payload, 시크릿 키, 옵션)
  const accessToken = jwt.sign(
    {
      sub: user._id.toString(), // JWT의 subject: 고유 식별자 (_id 사용)
      email: user.email,
      role: user.role, // 사용자 권한 정보 (예: 'admin', 'user')
    },
    ACCESS_TOKEN_SECRET, // 비밀 키
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN, // 만료 시간 (초 단위)
    }
  );

  // RefreshToken 생성 (payload 최소화: user ID만 사용)
  const refreshToken = jwt.sign(
    {
      sub: user._id.toString(), // subject에만 사용자 고유 ID 저장
    },
    REFRESH_TOKEN_SECRET, // 별도 비밀 키
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN, // 7일 유효
    }
  );

  // JSON 응답: 토큰은 쿠키로만 전달하므로 success만 반환
  const response = NextResponse.json({ success: true });

  response.cookies.set('accessToken', accessToken, {
    ...baseCookie,
    maxAge: ACCESS_TOKEN_EXPIRES_IN,
  });

  response.cookies.set('refreshToken', refreshToken, {
    ...baseCookie,
    maxAge: REFRESH_TOKEN_EXPIRES_IN,
  });

  // 토큰 쿠키 세팅 직후, 자동 귀속 + 최근 로그인 기록
  try {
    const db = await getDb();
    await Promise.all([autoLinkStringingByEmail(db as any, user._id, user.email), db.collection('users').updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })]);
  } catch (e) {
    console.warn('[login] post-login side effects fail:', e);
  }

  return response;
}
