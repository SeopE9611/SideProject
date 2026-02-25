import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { getDb } from '@/lib/mongodb';
import { baseCookie } from '@/lib/cookieOptions';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { ADMIN_CSRF_COOKIE_KEY } from '@/lib/admin/adminCsrf';
import { Collection } from 'mongodb';
import crypto from 'crypto';

/**
 * GET /api/oauth/kakao/callback
 * - code/state 검증
 * - code → token 교환
 * - token으로 user/me 조회 (email, nickname)
 * - 우리 users에 upsert
 * - 기존 로그인과 동일하게 accessToken/refreshToken 쿠키 발급
 * - from 값에 따라 /cart 또는 / 로 이동
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ message: '카카오 env(KAKAO_CLIENT_ID/SECRET)가 누락되었습니다.' }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // 1) 카카오에서 에러로 돌아온 경우
  if (error) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 2) state 검증(CSRF 방지)
  const stateCookie = req.cookies.get('kakao_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 3) code → token 교환
  const redirectUri = `${getBaseUrl()}/api/oauth/kakao/callback`;

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: tokenBody.toString(),
  });

  if (!tokenRes.ok) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  const tokenJson: any = await tokenRes.json();
  const kakaoAccessToken = tokenJson?.access_token;

  if (!kakaoAccessToken) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 4) 사용자 정보 조회(user/me)
  const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${kakaoAccessToken}` },
  });

  if (!meRes.ok) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  const meJson: any = await meRes.json();
  const kakaoId = meJson?.id;
  const emailRaw = meJson?.kakao_account?.email ? String(meJson.kakao_account.email) : '';
  const email = emailRaw.trim().toLowerCase();
  const nickname = meJson?.kakao_account?.profile?.nickname;

  // 이메일이 없으면(사용자 계정에 이메일이 없거나 동의 불가 케이스)
  if (!email) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 5) DB: 기존이면 로그인 / 신규면 pending 생성 후 회원가입 탭 이동
  const db = await getDb();
  const users = db.collection('users');

  type PendingDoc = {
    _id: string; // token
    provider: 'kakao';
    oauthId: string | null;
    email: string;
    name: string;
    from: string | null;
    createdAt: Date;
    expiresAt: Date;
  };

  const pendings = db.collection('oauth_pending_signups') as Collection<PendingDoc>;

  const user = await users.findOne({ email });

  // 신규 유저: users를 만들지 말고 pending으로 보냄
  if (!user) {
    const now = new Date();
    const token = crypto.randomUUID();

    const from = req.cookies.get('kakao_oauth_from')?.value ?? null;

    await pendings.insertOne({
      _id: token,
      provider: 'kakao',
      oauthId: kakaoId ? String(kakaoId) : null,
      email,
      name: nickname || email.split('@')[0],
      from,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 10),
    });

    const registerUrl = `${getBaseUrl()}/login?tab=register&oauth=kakao&token=${encodeURIComponent(token)}${from === 'cart' ? '&from=cart' : ''}`;
    const res = NextResponse.redirect(registerUrl);

    // oauth 임시 쿠키 제거(재사용 방지)
    res.cookies.delete('kakao_oauth_state');
    res.cookies.delete('kakao_oauth_from');
    return res;
  }

  // 이미 다른 kakaoId가 연결된 계정이면 충돌 방지
  const existingKakaoId = user?.oauth?.kakao?.id ?? null;
  if (existingKakaoId && kakaoId && String(existingKakaoId) !== String(kakaoId)) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 기존 유저: kakao 연동 보강
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        updatedAt: new Date(),
        'oauth.kakao.id': kakaoId ? String(kakaoId) : null, //
        'oauth.kakao.connectedAt': new Date(),
      },
    }
  );

  // 6) 우리 JWT 발급(기존 /api/login과 동일한 쿠키명)
  const accessToken = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

  const refreshToken = jwt.sign({ sub: user._id.toString() }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  // 7) 어디로 보낼지(from 쿠키)
  const from = req.cookies.get('kakao_oauth_from')?.value;
  const destPath = from === 'cart' ? '/cart' : '/';

  const res = NextResponse.redirect(`${getBaseUrl()}${destPath}`);

  // 토큰 쿠키 세팅
  res.cookies.set('accessToken', accessToken, { ...baseCookie, maxAge: ACCESS_TOKEN_EXPIRES_IN });
  res.cookies.set('refreshToken', refreshToken, { ...baseCookie, maxAge: REFRESH_TOKEN_EXPIRES_IN });

  // 관리자 계정으로 OAuth 로그인한 경우 admin CSRF 쿠키를 함께 발급
  if (user.role === 'admin') {
    const adminCsrfToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
    res.cookies.set(ADMIN_CSRF_COOKIE_KEY, adminCsrfToken, {
      ...baseCookie,
      httpOnly: false,
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
    });
  } else {
    // 일반 사용자 세션에서는 관리자 CSRF 쿠키를 남기지 않음
    res.cookies.set(ADMIN_CSRF_COOKIE_KEY, '', {
      ...baseCookie,
      httpOnly: false,
      maxAge: 0,
    });
  }

  // 혹시 남아있던 강제 비번변경 플래그 제거(일반 로그인과 정합)
  res.cookies.delete('force_pwd_change');

  // oauth 임시 쿠키 제거
  res.cookies.delete('kakao_oauth_state');
  res.cookies.delete('kakao_oauth_from');

  // 8) 로그인 직후 부가 처리(기존 login route와 동일 컨셉)
  try {
    // 최근 로그인 기록
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
    const ua = req.headers.get('user-agent') || '';

    await db.collection('user_sessions').insertOne({
      userId: user._id,
      at: new Date(),
      ip,
      ua,
    });

    await Promise.all([autoLinkStringingByEmail(db, user._id, user.email), db.collection('users').updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })]);
  } catch (e) {
    console.warn('[kakao callback] post-login side effects fail:', e);
  }

  return res;
}
