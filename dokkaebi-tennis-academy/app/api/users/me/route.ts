import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

// 환경변수에서 JWT 비밀키 로딩
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

// GET: 현재 로그인한 사용자 정보 조회
export async function GET() {
  // 서버 쿠키 저장소에서 accessToken 읽기
  const jar = await cookies();
  const accessToken = jar.get('accessToken')?.value;

  // accessToken이 없으면 인증 실패
  if (!accessToken) {
    console.log('[API users/me] No cookie token!');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // sub(= user._id)를 사용
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as JwtPayload;
    const sub = decoded?.sub as string | undefined;
    if (!sub) {
      // 구 토큰 등에서 email만 담겼다면 과도기적으로 email fallback을 두어도 됨.
      // 여기서는 정책을 명확히 하기 위해 sub 없으면 401 처리.
      return NextResponse.json({ error: 'Invalid token (no sub)' }, { status: 401 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(sub) }, { projection: { hashedPassword: 0 } });

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

    // 4) 정상 응답(보여줘도 되는 필드만)
    return NextResponse.json({
      id: user._id.toString(),
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? 'user',
      phone: user.phone ?? null,
      address: user.address ?? null,
      addressDetail: user.addressDetail ?? null,
      postalCode: user.postalCode ?? null,
      pointsBalance: typeof (user as any).pointsBalance === 'number' ? (user as any).pointsBalance : 0, // 마이페이지(적립금 표시)에서 바로 쓰도록 포함
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

  const { name, phone, postalCode, address, addressDetail /*, marketing*/ } = await req.json();

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
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API users/me] DB error:', err);
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }
}
