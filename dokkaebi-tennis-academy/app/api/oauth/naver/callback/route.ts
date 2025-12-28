import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { getDb } from '@/lib/mongodb';
import { baseCookie } from '@/lib/cookieOptions';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { Collection } from 'mongodb';
import crypto from 'crypto';

/**
 * GET /api/oauth/naver/callback
 * - code/state 검증
 * - code → token 교환
 * - token으로 nid/me 조회 (email, name)
 * - 우리 users에 upsert(연동)
 * - 신규면 oauth_pending_signups에 _id=token 저장 후 /login register로 보냄
 * - 기존 로그인과 동일하게 accessToken/refreshToken 쿠키 발급
 * - from 값에 따라 /cart 또는 / 로 이동
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ message: '네이버 env(NAVER_CLIENT_ID/SECRET)가 누락되었습니다.' }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // 1) 네이버에서 에러로 돌아온 경우
  if (error) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 2) state 검증(CSRF 방지)
  const stateCookie = req.cookies.get('naver_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 3) code → token 교환
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    state,
  });

  const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: tokenBody.toString(),
  });

  const tokenJson = (await tokenRes.json().catch(() => null)) as any;
  const naverAccessToken = tokenJson?.access_token;

  if (!naverAccessToken) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 4) 사용자 정보 조회(nid/me)
  const meRes = await fetch('https://openapi.naver.com/v1/nid/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${naverAccessToken}` },
  });

  if (!meRes.ok) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  const meJson = (await meRes.json().catch(() => null)) as any;
  const naverId = meJson?.response?.id ? String(meJson.response.id) : null;
  const emailRaw = meJson?.response?.email ? String(meJson.response.email) : '';
  const email = emailRaw.trim().toLowerCase();
  const name = (meJson?.response?.name ? String(meJson.response.name) : '') || (meJson?.response?.nickname ? String(meJson.response.nickname) : '') || (email ? email.split('@')[0] : '');

  // 이메일이 없으면(동의 안했거나 콘솔 설정 문제) 우리 시스템은 가입 진행 불가
  if (!naverId || !email) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 5) 우리 users 조회
  const db = await getDb();
  const users = db.collection('users');

  let user = await users.findOne({ email });

  // 신규 유저: users를 만들지 말고 pending으로 보냄
  if (!user) {
    type PendingDoc = {
      _id: string; // token
      provider: 'naver';
      oauthId: string | null;
      email: string;
      name: string;
      from: string | null;
      createdAt: Date;
      expiresAt: Date;
    };

    const pendings = db.collection('oauth_pending_signups') as Collection<PendingDoc>;

    const now = new Date();
    const token = crypto.randomUUID();
    const from = req.cookies.get('naver_oauth_from')?.value ?? null;

    await pendings.insertOne({
      _id: token,
      provider: 'naver',
      oauthId: naverId,
      email,
      name,
      from,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 10),
    });

    const registerUrl = `${getBaseUrl()}/login?tab=register&oauth=naver&token=${encodeURIComponent(token)}${from === 'cart' ? '&from=cart' : ''}`;
    const res = NextResponse.redirect(registerUrl);

    // oauth 임시 쿠키 제거(재사용 방지)
    res.cookies.delete('naver_oauth_state');
    res.cookies.delete('naver_oauth_from');
    return res;
  }

  // 이미 다른 naverId가 연결된 계정이면 충돌 방지
  const existingNaverId = user?.oauth?.naver?.id ?? null;
  if (existingNaverId && naverId && String(existingNaverId) !== String(naverId)) {
    const loginUrl = `${getBaseUrl()}/login?tab=login`;
    return NextResponse.redirect(loginUrl);
  }

  // 기존 유저: naver 연동 보강
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        updatedAt: new Date(),
        'oauth.naver.id': naverId,
        'oauth.naver.connectedAt': new Date(),
      },
    }
  );

  // 6) 우리 JWT 발급(기존 /api/login과 동일한 쿠키명)
  const accessToken = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ sub: user._id.toString() }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  // 7) 어디로 보낼지(from 쿠키)
  const from = req.cookies.get('naver_oauth_from')?.value;
  const destPath = from === 'cart' ? '/cart' : '/';

  const res = NextResponse.redirect(`${getBaseUrl()}${destPath}`);

  // 토큰 쿠키 세팅
  res.cookies.set('accessToken', accessToken, { ...baseCookie, maxAge: ACCESS_TOKEN_EXPIRES_IN });
  res.cookies.set('refreshToken', refreshToken, { ...baseCookie, maxAge: REFRESH_TOKEN_EXPIRES_IN });

  // 혹시 남아있던 강제 비번변경 플래그 제거(일반 로그인과 정합)
  res.cookies.delete('force_pwd_change');

  // oauth 임시 쿠키 제거
  res.cookies.delete('naver_oauth_state');
  res.cookies.delete('naver_oauth_from');

  // 8) 로그인 직후 부가 처리(기존 login/kakao callback과 동일 컨셉)
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
    const ua = req.headers.get('user-agent') || '';

    await db
      .collection('user_sessions')
      .createIndex({ userId: 1, at: -1 })
      .catch((e: any) => {
        if (e?.code !== 85) throw e;
      });

    await db.collection('user_sessions').insertOne({
      userId: user._id,
      at: new Date(),
      ip,
      ua,
    });

    await Promise.all([
      autoLinkStringingByEmail(db, user._id, user.email).catch((e: any) => {
        if (e?.code !== 85) throw e;
      }),
      users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }),
    ]);
  } catch (e) {
    console.warn('[naver callback] post-login side effects fail:', e);
  }

  return res;
}
