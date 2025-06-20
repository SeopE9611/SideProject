import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db();

    // 'stringing_applications' 컬렉션에서 신청서 목록 전체 조회
    const applications = await db
      .collection('stringing_applications') // 정확한 컬렉션명 주의
      .find({})
      .sort({ createdAt: -1 }) // 최신순 정렬
      .toArray();

    // 신청서 목록을 JSON 응답으로 반환
    return NextResponse.json(applications);
  } catch (err) {
    console.error('신청 목록 조회 오류:', err);
    //  에러 발생 시 500 상태와 메시지 반환
    return NextResponse.json({ message: '목록을 불러올 수 없습니다.' }, { status: 500 });
  }
}
