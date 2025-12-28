// app/api/oauth/kakao/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { baseCookie } from '@/lib/cookieOptions';

/**
 * GET /api/oauth/kakao
 * - 카카오 인증 페이지로 리다이렉트(인가 코드 받기)
 * - CSRF 방지용 state + 로그인 후 이동 경로(from)를 HttpOnly 쿠키로 잠깐 저장
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ message: 'KAKAO_CLIENT_ID가 설정되지 않았습니다.' }, { status: 500 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from') || ''; // 예: cart
  const state = crypto.randomBytes(16).toString('hex');

  // 카카오 콘솔에 등록한 Redirect URI와 반드시 동일해야 함
  const redirectUri = `${getBaseUrl()}/api/oauth/kakao/callback`;

  // 카카오 인가 URL 생성
  const authorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);

  // 동의항목에서 account_email을 필수로 해뒀으니 scope에도 포함(권장)
  authorizeUrl.searchParams.set('scope', 'profile_nickname,profile_image,account_email');

  // 카카오로 보내기(redirect)
  const res = NextResponse.redirect(authorizeUrl.toString());

  // state/from은 10분만 저장 (HttpOnly)
  res.cookies.set('kakao_oauth_state', state, { ...baseCookie, maxAge: 60 * 10 });
  if (from) res.cookies.set('kakao_oauth_from', from, { ...baseCookie, maxAge: 60 * 10 });

  return res;
}
