import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { baseCookie } from '@/lib/cookieOptions';

/**
 * GET /api/oauth/naver
 * - 네이버 인증 페이지로 리다이렉트(인가 코드 받기)
 * - CSRF 방지용 state + 로그인 후 이동 경로(from)를 HttpOnly 쿠키로 잠깐 저장
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ message: 'NAVER_CLIENT_ID가 설정되지 않았습니다.' }, { status: 500 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from'); // 'cart' 같은 값

  // CSRF 방지용 state
  const state = crypto.randomBytes(16).toString('hex');

  const redirectUri = `${getBaseUrl()}/api/oauth/naver/callback`;

  const authorizeUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);

  // 네이버로 보내기(redirect)
  const res = NextResponse.redirect(authorizeUrl.toString());

  // state/from은 10분만 저장 (HttpOnly)
  res.cookies.set('naver_oauth_state', state, { ...baseCookie, maxAge: 60 * 10 });
  if (from) res.cookies.set('naver_oauth_from', from, { ...baseCookie, maxAge: 60 * 10 });

  return res;
}
