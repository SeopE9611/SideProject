// JWT 기반 사용자 인증 API (GET: 내 정보 조회 / PATCH: 내 정보 수정)
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server'; // 요청/응답 객체
import jwt from 'jsonwebtoken'; // JWT 해석 및 검증용
import clientPromise from '@/lib/mongodb'; // MongoDB 연결
import { ObjectId } from 'mongodb'; // 사용자 _id 타입
import { getUserByEmail } from '@/lib/user-service'; // 이메일로 사용자 조회

// 환경변수에서 JWT 비밀키 로딩
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

// GET: 현재 로그인한 사용자 정보 조회

export async function GET() {
  // 서버 쿠키 저장소에서 accessToken 읽기
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // accessToken이 없으면 인증 실패
  if (!accessToken) {
    console.log('[API users/me] No cookie token!');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // JWT 디코딩 (payload에는 email 포함)
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as { email: string };

    // 이메일로 사용자 조회
    const user = await getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 프론트에 노출 가능한 필드만 전달
    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      addressDetail: user.addressDetail,
      postalCode: user.postalCode,
      // marketing: user.marketing,
    };

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('[API users/me] Token error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

// PATCH: 현재 로그인한 사용자의 정보 수정 요청

export async function PATCH(req: NextRequest) {
  // accessToken 쿠키 읽기
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 인증되지 않은 요청
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // JWT 검증
  let payload: { sub: string }; // sub: user._id
  try {
    payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as { sub: string };
  } catch (e) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // 사용자로부터 전달받은 수정 내용
  const { name, phone, postalCode, address, addressDetail, marketing } = await req.json();

  // MongoDB 연결 후 사용자 정보 업데이트
  const client = await clientPromise;
  const db = client.db();

  await db.collection('users').updateOne(
    { _id: new ObjectId(payload.sub) },
    {
      $set: {
        name,
        phone,
        postalCode,
        address,
        addressDetail,
        // marketing,
      },
    }
  );

  return NextResponse.json({ success: true });
}
