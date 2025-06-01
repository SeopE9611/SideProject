// app/api/users/me/route.ts

// 로그인된 사용자의 세션 정보를 가져오기 위한 함수

// MongoDB 연결을 위한 Promise 객체
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

// ✅ GET: 현재 로그인된 사용자의 정보 조회
export async function GET() {
  const session = await auth(); // 로그인된 세션 가져오기

  if (!session?.user?.email) {
    // 로그인하지 않은 경우 401 반환
    return new Response('Unauthorized', { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();

  // 현재 로그인된 사용자의 이메일로 users 컬렉션에서 조회
  const user = await db.collection('users').findOne({
    email: session.user.email,
  });

  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  // 프론트에 필요한 정보만 골라서 보냄 (보안상 비밀번호 등 제외)
  const { name, email, phone, birthDate, gender, address, postalCode } = user;

  return Response.json({ name, email, phone, birthDate, gender, address, postalCode });
}

// ✅ PATCH: 사용자 정보 수정
export async function PATCH(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 클라이언트에서 보낸 JSON 데이터를 파싱
  const body = await req.json();
  const { name, phone, birthDate, gender, address, postalCode } = body;

  const client = await clientPromise;
  const db = client.db();

  // 로그인된 사용자의 이메일 기준으로 필드 업데이트
  await db.collection('users').updateOne(
    { email: session.user.email },
    {
      $set: {
        name,
        phone,
        birthDate,
        gender,
        address,
        postalCode,
      },
    }
  );

  return new Response('Updated', { status: 200 });
}
