import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/mongodb';
import { baseCookie } from '@/lib/cookieOptions';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { Collection } from 'mongodb';
import { isSignupBonusActive, SIGNUP_BONUS_POINTS, signupBonusRefKey } from '@/lib/points.policy';
import { grantPoints } from '@/lib/points.service';

type PendingDoc = {
  _id: string; // token
  provider: 'kakao' | 'naver';
  oauthId: string | null;
  email: string;
  name: string;
  from: string | null;
  createdAt: Date;
  expiresAt: Date;
};

type Body = {
  token: string;
  name?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
};

async function ensureIndexes(db: any) {
  const pendings = db.collection('oauth_pending_signups') as Collection<PendingDoc>;

  await pendings.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((e: any) => {
    if (e?.code !== 85) throw e;
  });

  await db
    .collection('user_sessions')
    .createIndex({ userId: 1, at: -1 })
    .catch((e: any) => {
      if (e?.code !== 85) throw e;
    });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const db = await getDb();
  await ensureIndexes(db);

  const pendings = db.collection('oauth_pending_signups') as Collection<PendingDoc>;
  const pending = await pendings.findOne({ _id: body.token });

  if (!pending) {
    return NextResponse.json({ error: 'pending signup not found (expired or invalid)' }, { status: 404 });
  }

  //  TTL 삭제 타이밍(지연)을 믿지 말고, 서버에서 만료도 직접 차단
  const now = new Date();
  if (pending.expiresAt && pending.expiresAt <= now) {
    await pendings.deleteOne({ _id: pending._id }).catch(() => {});
    return NextResponse.json({ error: 'pending signup not found (expired or invalid)' }, { status: 404 });
  }

  //  이메일 정규화 (기존 register/login 정책과 정합)
  const pendingEmailRaw = String(pending.email ?? '').trim();
  const pendingEmail = pendingEmailRaw.toLowerCase();
  if (!pendingEmail) {
    await pendings.deleteOne({ _id: pending._id }).catch(() => {});
    return NextResponse.json({ error: 'pending signup invalid (missing email)' }, { status: 400 });
  }

  //  사용자가 입력한 이름을 우선(없으면 pending.name fallback)
  const incomingName = typeof body.name === 'string' ? body.name.trim() : '';

  const users = db.collection('users');

  // 1) 같은 이메일 유저가 이미 있으면 "연동 + 로그인"으로 처리
  // 케이스 차이로 인한 매칭 실패 방지: raw/lower 둘 다 조회
  let isNewUser = false;
  let user = await users.findOne({ $or: [{ email: pendingEmail }, { email: pendingEmailRaw }] });

  if (user) {
    const providerKey = pending.provider; // 'kakao' | 'naver'
    const providerLabel = providerKey === 'naver' ? '네이버' : '카카오';
    const existingOauthId = (user as any)?.oauth?.[providerKey]?.id ?? null;

    if (existingOauthId && pending.oauthId && String(existingOauthId) !== String(pending.oauthId)) {
      return NextResponse.json({ error: `이미 다른 ${providerLabel} 계정에 연결된 이메일입니다.` }, { status: 409 });
    }

    const shouldUpdateName = !!incomingName && (!user?.name || String(user.name).trim() === '');

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          // 기존에 대문자/혼합 케이스로 저장된 이메일을 정규화(가능한 범위에서 정합 유지)
          email: pendingEmail,
          ...(shouldUpdateName ? { name: incomingName } : {}),
          updatedAt: now,
          lastLoginAt: now,
          [`oauth.${providerKey}.id`]: pending.oauthId,
          [`oauth.${providerKey}.connectedAt`]: now,
        },
      }
    );
    user = await users.findOne({ _id: user._id });
  } else {
    // 2) 신규 생성
    isNewUser = true;
    const insertRes = await users.insertOne({
      email: pendingEmail,
      name: incomingName || pending.name || pendingEmail.split('@')[0],
      role: 'user',
      isDeleted: false,
      isSuspended: false,
      pointsBalance: 0,
      pointsDebt: 0,
      phone: body.phone || '',
      postalCode: body.postalCode || '',
      address: body.address || '',
      addressDetail: body.addressDetail || '',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      oauth: {
        [pending.provider]: {
          id: pending.oauthId,
          connectedAt: now,
        },
      },
    });

    user = await users.findOne({ _id: insertRes.insertedId });
  }
  if (!user) {
    return NextResponse.json({ error: 'user create/link failed' }, { status: 500 });
  }

  if (user.isDeleted) return NextResponse.json({ error: 'deleted user' }, { status: 403 });
  if (user.isSuspended) return NextResponse.json({ error: 'suspended user' }, { status: 403 });

  // (이벤트) 회원가입 보너스 지급: "신규 생성"일 때만
  // - 중복 호출/리트라이가 있어도 refKey(unique)로 멱등 보장
  // - 지급 실패가 회원가입/로그인을 막지 않도록 try/catch로 격리
  if (isNewUser) {
    try {
      if (isSignupBonusActive()) {
        await grantPoints(db, {
          userId: user._id,
          amount: SIGNUP_BONUS_POINTS,
          type: 'signup_bonus',
          refKey: signupBonusRefKey(user._id),
          reason: `회원가입 보너스 ${SIGNUP_BONUS_POINTS}P`,
        });
      }
    } catch (e) {
      console.warn('[oauth complete] signup bonus grant failed:', e);
    }
  }

  // 3) 로그인 쿠키 발급
  const accessToken = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: user._id.toString() }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  // 4) 부가 처리(세션로그/자동연결)
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
    const ua = req.headers.get('user-agent') || '';

    await db.collection('user_sessions').insertOne({
      userId: user._id,
      at: now,
      ip,
      ua,
    });

    await Promise.all([autoLinkStringingByEmail(db, user._id, String(user.email ?? pendingEmail).toLowerCase()), users.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } })]);
  } catch (e) {
    console.warn('[oauth complete] post-login side effects fail:', e);
  }

  // 5) pending 제거
  await pendings.deleteOne({ _id: pending._id });

  const redirectTo = pending.from === 'cart' ? '/cart' : '/';
  const res = NextResponse.json({ ok: true, redirectTo });

  res.cookies.set('accessToken', accessToken, { ...baseCookie, maxAge: ACCESS_TOKEN_EXPIRES_IN });
  res.cookies.set('refreshToken', refreshToken, { ...baseCookie, maxAge: REFRESH_TOKEN_EXPIRES_IN });
  res.cookies.delete('force_pwd_change');

  return res;
}
