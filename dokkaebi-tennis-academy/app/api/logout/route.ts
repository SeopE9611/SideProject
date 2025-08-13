import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  //  accessToken 쿠키 제거
  response.cookies.set('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0, // 즉시 만료
  });

  // refreshToken 쿠키도 제거
  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
