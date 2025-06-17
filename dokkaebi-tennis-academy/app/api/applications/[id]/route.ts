import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET 메서드 정의
export async function GET(req: Request, context: { params: { id: string } }) {
  try {
    const id = context.params.id;

    // 유효성 검사: 빈 ID일 경우 400 반환
    if (!id) {
      return NextResponse.json({ error: '신청 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // ObjectId 또는 문자열 ID 모두 처리 가능하도록 쿼리 구성
    const application = await db
      .collection('applications') // 🔍 'applications' 컬렉션에서
      .findOne({
        $or: [
          { _id: new ObjectId(id) }, // MongoDB ObjectId 형태
          { id }, // 혹시 문자열 id로 저장되어 있는 경우도 대응
        ],
      });

    // 신청서를 찾지 못한 경우
    if (!application) {
      return NextResponse.json({ error: '해당 신청서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 반환 전에 _id를 string으로 변환 (프론트와의 호환 위해)
    const responseData = {
      ...application,
      _id: application._id.toString(),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('신청서 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
