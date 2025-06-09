// /api/login/route.ts
import { cookies as getCookies } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserByEmail, verifyPassword } from '@/lib/user-service';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // 1시간
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7일

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  // 입력값 검증
  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  //  사용자 존재 여부 확인
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: '잘못된 로그인 정보입니다.' }, { status: 401 });
  }

  // Access Token 생성 (1시간 유효)
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );

  // Refresh Token 생성 (7일 유효)
  const refreshToken = jwt.sign(
    {
      sub: user.id,
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );

  // Refresh Token을 HttpOnly 쿠키로 저장 (JS에서 접근 불가, 보안성 ↑)
  const response = NextResponse.json({ accessToken });
  //  response에 쿠키를 설정하는 방식
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true, // JS에서 접근 불가 (XSS 보호)
    secure: process.env.NODE_ENV === 'production', // HTTPS 환경에서만 작동
    sameSite: 'strict', // 크로스사이트 요청 차단
    maxAge: REFRESH_TOKEN_EXPIRES_IN, // 쿠키 유효 시간 (7일)
    path: '/',
  });

  // ✅클라이언트에는 Access Token만 반환
  return NextResponse.json({ accessToken });
}
