import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { performance } from 'node:perf_hooks';

// 환경변수에서 JWT 비밀키 로딩
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

// GET: 현재 로그인한 사용자 정보 조회
export async function GET() {
  // 서버 쿠키 저장소에서 accessToken 읽기
  const jar = await cookies();
  const accessToken = jar.get('accessToken')?.value;
  const dbg = process.env.DEBUG_USERS_ME === '1';

  // accessToken이 없으면 인증 실패
  if (!accessToken) {
    // 운영 노이즈 방지: 디버그 플래그 ON일 때만 출력
    dbg && console.warn('[API users/me] No cookie token!');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const t0 = performance.now();

  dbg && console.log('[me] cookies', (performance.now() - t0).toFixed(1), 'ms');

  try {
    // sub(= user._id)를 사용
    const t1 = performance.now();
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as JwtPayload;
    dbg && console.log('[me] jwt.verify', (performance.now() - t1).toFixed(1), 'ms');
    const sub = decoded?.sub as string | undefined;
    if (!sub) {
      // 구 토큰 등에서 email만 담겼다면 과도기적으로 email fallback을 두어도 됨.
      // 여기서는 정책을 명확히 하기 위해 sub 없으면 401 처리.
      return NextResponse.json({ error: 'Invalid token (no sub)' }, { status: 401 });
    }

    const t2 = performance.now();
    const db = await getDb();
    dbg && console.log('[me] getDb', (performance.now() - t2).toFixed(1), 'ms');
    const t3 = performance.now();
    const user = await db.collection('users').findOne({ _id: new ObjectId(sub) }, { projection: { hashedPassword: 0 } });
    dbg && console.log('[me] findOne', (performance.now() - t3).toFixed(1), 'ms');
    dbg && console.log('[me] total', (performance.now() - t0).toFixed(1), 'ms');

    // 1) 존재X
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2) 탈퇴(soft delete)
    if (user.isDeleted) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
    }

    // 3) 비활성
    if (user.isSuspended) {
      return NextResponse.json({ message: 'suspended' }, { status: 403 });
    }

    // 소셜 로그인 제공자 배지 표시용
    const socialProviders: Array<'kakao' | 'naver'> = [];
    const oauth = (user as any)?.oauth ?? {};
    if (oauth?.kakao?.id) socialProviders.push('kakao');
    if (oauth?.naver?.id) socialProviders.push('naver');

    // 소셜 로그인 제공자(표시용): oauth id를 노출하지 않고 "연동 여부"만 내려줌
    const oauthProviders = [oauth?.kakao?.id ? 'kakao' : null, oauth?.naver?.id ? 'naver' : null].filter(Boolean) as Array<'kakao' | 'naver'>;
    return NextResponse.json({
      id: user._id.toString(),
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? 'user',
      oauthProviders,
      phone: user.phone ?? null,
      address: user.address ?? null,
      addressDetail: user.addressDetail ?? null,
      postalCode: user.postalCode ?? null,
      pointsBalance: typeof (user as any).pointsBalance === 'number' ? (user as any).pointsBalance : 0, // 마이페이지(적립금 표시)에서 바로 쓰도록 포함
      socialProviders,
    });
  } catch (err: any) {
    // 토큰 오류(만료/변조)
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    // DB/네트워크 오류
    console.error('[API users/me] DB error:', err);
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }
}

// PATCH: 현재 로그인한 사용자의 정보 수정 요청
export async function PATCH(req: NextRequest) {
  // accessToken 쿠키 읽기
  const jar = await cookies();
  const accessToken = jar.get('accessToken')?.value;

  // 인증되지 않은 요청
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // JWT 검증
  let payload: JwtPayload;
  try {
    payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  const sub = payload?.sub as string | undefined;
  if (!sub) {
    return NextResponse.json({ error: 'Invalid token (no sub)' }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[users/me] invalid json', e);
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { name, phone, postalCode, address, addressDetail /*, marketing*/ } = body;

  // 선택 필드는 값이 들어왔을 때만 타입을 확인합니다.
  if (name != null && typeof name !== 'string') return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 });
  if (phone != null && typeof phone !== 'string') return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
  if (postalCode != null && typeof postalCode !== 'string') return NextResponse.json({ error: 'INVALID_POSTAL_CODE' }, { status: 400 });
  if (address != null && typeof address !== 'string') return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
  if (addressDetail != null && typeof addressDetail !== 'string') return NextResponse.json({ error: 'INVALID_ADDRESS_DETAIL' }, { status: 400 });

  try {
    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: new ObjectId(sub) },
      {
        $set: {
          ...(name !== undefined && { name }),
          ...(phone !== undefined && { phone }),
          ...(postalCode !== undefined && { postalCode }),
          ...(address !== undefined && { address }),
          ...(addressDetail !== undefined && { addressDetail }),
          // ...(marketing !== undefined && { marketing }),
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API users/me] DB error:', err);
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }
}
