/* 스터디 메모 기록용 (6/10)
 *  NextAuth 기반 세션 인증 흐름 로직 삭제 후 JWT 토큰 기반으로 채택 (솔직히 후회중 tq)
 * 즉 클라이언트가 Authorization: Bearer <accessToken> 헤더로 요청하고,
 * 서버가 jwt.verify(...)로 검증해서 MongoDB에서 사용자 정보를 반환하기 위한 작업으로 교체함
 */

// 로그인된 사용자 정보를 반환하는 API 라우트
// JWT 토큰 기반으로 인증을 처리하며, 사용자는 accessToken을 통해만 접근 가능

// MongoDB 연결을 위한 Promise 객체
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server'; // 요청/응답을 위한 Nextjs 객체
import jwt from 'jsonwebtoken'; // JWT 토큰 검증을 위한 라이브러리
import clientPromise from '@/lib/mongodb'; // MongoDB 클라이언트 연결 함수
import { ObjectId } from 'mongodb'; // MongoDB _id를 위해 필요
import { JwtPayload } from '@supabase/supabase-js';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!; // .env에서 가져온 JWT 비밀키

export async function GET(req: NextRequest) {
  //  헤더가 실제로 오는지 찍어보기
  console.log('[API users/me] authorization header:', req.headers.get('authorization'));

  // “Bearer ” 검증
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    console.log('[API users/me] No Bearer token!');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // 토큰 검증
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, ACCESS_TOKEN_SECRET!) as JwtPayload;
    console.log('[API users/me] decoded payload:', decoded);
  } catch (err) {
    console.error('[API users/me] jwt.verify failed:', err);
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // sub 체크
  const userId = decoded.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
  }

  // DB 조회
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId), isDeleted: false }, { projection: { hashedPassword: 0, password: 0 } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // raw user 반환 (getMyInfo 쪽에서 { user: … } 으로 래핑)
  return NextResponse.json(user);
}

// export async function GET(req: NextRequest) {
//   // Authorization 헤더에서 토큰 문자열 추출: "Bearer <accessToken>"
//   const authHeader = req.headers.get('authorization');
//   const token = authHeader?.split(' ')[1]; // 앞의 "Bearer" 제거 후 토큰만 추출

//   // 토큰이 없는 경우 -> 인증되지 않은 요청
//   if (!token) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   }

//   try {
//     // 토큰 검증 → 유효하면 payload 반환, 아니면 예외 발생
//     const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
//     console.log('▶ decoded payload:', decoded);
//     // 토큰 payload에서 사용자 ID 추출 (로그인 시 발급한 토큰의 sub에 userId 저장되어 있음)
//     const userId = decoded.sub;

//     if (!userId) {
//       return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
//     }

//     // MongoDB에 연결
//     const client = await clientPromise;
//     const db = client.db();

//     // 사용자 정보를 DB에서 조회 (탈퇴한 사용자는 제외)
//     const user = await db.collection('users').findOne(
//       {
//         _id: new ObjectId(userId), // 사용자 _id로 찾음
//         isDeleted: false, // 탈퇴하지 않은 사용자만 조회
//       },
//       {
//         // 비밀번호 관련 필드는 응답에서 제거 (보안)
//         projection: {
//           hashedPassword: 0,
//           password: 0,
//         },
//       }
//     );

//     // 사용자가 존재하지 않을 경우
//     if (!user) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }

//     //  최종적으로 사용자 정보를 클라이언트에 반환
//     return NextResponse.json({ user });
//   } catch (err) {
//     // 토큰이 만료되었거나 변조된 경우 → 인증 실패
//     return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
//   }
// }

//  PATCH: 사용자 정보 수정
export async function PATCH(req: NextRequest) {
  // Authorization 헤더에서 "Bearer <token>" 문자열 가져오기
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // JWT 토큰 검증
  let payload: { sub: string };
  try {
    payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as { sub: string };
  } catch (e) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // 요청 바디에서 수정할 사용자 정보 추출
  const { name, phone, postalCode, address, addressDetail, marketing } = await req.json();

  // MongoDB 연결 후 사용자 문서 업데이트
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
        marketing,
      },
    }
  );

  // 성공 응답
  return NextResponse.json({ success: true });
}
