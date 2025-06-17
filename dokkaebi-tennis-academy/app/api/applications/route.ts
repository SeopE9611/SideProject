import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; // MongoDB 연결을 위한 Promise 객체 불러오기

// 신청서 목록을 가져오는 GET API
export async function GET() {
  try {
    // MongoDB 클라이언트 연결
    const client = await clientPromise;
    const db = client.db();

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
