// Refresh Token을 통해 새로운 Access Token을 발급해주는 API

import { cookies } from 'next/headers'; // 쿠키 접근을 위한 Next.js 내장 함수
import { NextResponse } from 'next/server'; // 응답을 위한 Next.js 헬퍼
import jwt from 'jsonwebtoken'; // 토큰 생성 및 검증을 위한 라이브러리
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN } from '@/lib/constants';

// // 환경변수에서 Access Token과 Refresh Token 시크릿 키를 불러옴
// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

// // Access Token 만료 시간 (초 기준: 1시간)
// const ACCESS_TOKEN_EXPIRES_IN = 60 * 60;

export async function POST() {
  // 브라우저에 저장된 쿠키 중 refreshToken 가져오기
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  // 쿠키가 없으면 인증 실패 (401 Unauthorized)
  if (!refreshToken) {
    return NextResponse.json({ error: 'Refresh Token 없음' }, { status: 401 });
  }

  try {
    // Refresh Token 유효성 검증 (변조 or 만료된 경우 예외 발생)
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as jwt.JwtPayload;

    // 검증된 토큰에서 사용자 정보 꺼내서 새로운 Access Token 발급
    const newAccessToken = jwt.sign(
      {
        sub: decoded.sub, // 사용자 ID
        email: decoded.email, // (선택적) 이메일
        role: decoded.role, // (선택적) 역할 정보
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    // 새 Access Token을 JSON으로 클라이언트에게 전달
    return NextResponse.json({ accessToken: newAccessToken });
  } catch (error) {
    // Refresh Token이 유효하지 않거나 만료되었을 경우 (403 Forbidden)
    return NextResponse.json({ error: 'Refresh Token 만료 또는 변조됨' }, { status: 403 });
  }
}
