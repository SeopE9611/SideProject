import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/mongodb';
import { baseCookie } from '@/lib/cookieOptions';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { Collection } from 'mongodb';

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

type Body = {
  token: string;
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

  const users = db.collection('users');
  const now = new Date();

  // 1) 같은 이메일 유저가 이미 있으면 "연동 + 로그인"으로 처리
  let user = await users.findOne({ email: pending.email });

  if (user) {
    const existingKakaoId = user?.oauth?.kakao?.id ?? null;
    if (existingKakaoId && pending.oauthId && String(existingKakaoId) !== String(pending.oauthId)) {
      return NextResponse.json({ error: '이미 다른 카카오 계정에 연결된 이메일입니다.' }, { status: 409 });
    }

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          updatedAt: now,
          lastLoginAt: now,
          'oauth.kakao.id': pending.oauthId,
          'oauth.kakao.connectedAt': now,
        },
      }
    );
    user = await users.findOne({ _id: user._id });
  } else {
    // 2) 신규 생성
    const insertRes = await users.insertOne({
      email: pending.email,
      name: pending.name || pending.email.split('@')[0],
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
        kakao: {
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

    await Promise.all([autoLinkStringingByEmail(db, user._id, user.email), users.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } })]);
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
