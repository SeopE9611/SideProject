import { NextResponse } from 'next/server';
import clientPromise, { getDb } from '@/lib/mongodb'; // MongoDB 연결을 위한 Promise 객체 불러오기
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// 신청서 목록을 가져오는 GET API
export async function GET() {
  //  인증 처리
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload) return new NextResponse('Unauthorized', { status: 401 });
  try {
    // MongoDB 클라이언트 연결
    const client = await clientPromise;
    const db = await getDb();

    // applications 컬렉션에서 모든 신청서를 createdAt 기준 내림차순으로 조회
    const applications = await db
      .collection('applications')
      .find({})
      .sort({ createdAt: -1 }) // 최신순 정렬
      .toArray();

    // 결과를 JSON 형태로 응답
    return NextResponse.json(applications);
  } catch (error) {
    console.error('❌ 신청 목록 불러오기 오류:', error);

    // 오류가 발생한 경우 500 상태 코드 반환
    return new NextResponse('서버 오류: 신청 목록을 가져올 수 없습니다.', {
      status: 500,
    });
  }
}
