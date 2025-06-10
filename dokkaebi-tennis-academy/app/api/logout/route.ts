import { NextResponse } from 'next/server';

export async function POST() {
  //  빈값 + maxAge=0 으로 쿠키를 재설정 -> 즉시 삭제
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.set('refreshToken', '', {
    httpOnly: true, // JS 접근 불가
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // 즉시 만료
    path: '/', // 전체 경로에서 유효
  });

  // 클라이언트에는 로그아웃 완료 메시지 반환
  return response;
}
