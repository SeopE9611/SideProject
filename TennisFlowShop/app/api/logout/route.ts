import { NextResponse } from 'next/server';
import { baseCookie } from '@/lib/cookieOptions';
import { ADMIN_CSRF_COOKIE_KEY } from '@/lib/admin/adminCsrf';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // accessToken 쿠키 제거
  response.cookies.set('accessToken', '', {
    ...baseCookie,
    maxAge: 0, // 즉시 만료
  });

  // refreshToken 쿠키 제거
  response.cookies.set('refreshToken', '', {
    ...baseCookie,
    maxAge: 0,
  });

  // 전역 강제 리다이렉트 플래그 삭제
  response.cookies.set('force_pwd_change', '', { path: '/', httpOnly: true, maxAge: 0 });

  // 관리자 CSRF 쿠키도 명시적으로 제거해 세션 잔존 위험을 차단
  response.cookies.set(ADMIN_CSRF_COOKIE_KEY, '', {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  return response;
}
