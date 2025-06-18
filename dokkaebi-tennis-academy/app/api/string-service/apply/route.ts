import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// 스트링 장착 서비스 신청 처리 API (POST)
export async function POST(req: Request) {
  try {
    // 클라이언트에서 보낸 JSON 요청 본문을 파싱
    const body = await req.json();

    // 주문 ID와 신청 폼 데이터 분해
    const { orderId, ...formData } = body;

    // 주문 ID가 유효한 ObjectId인지 확인
    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: '유효하지 않은 주문 ID입니다.' }, { status: 400 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db();

    // 신청 폼 내용 저장 (string_applications 컬렉션에)
    await db.collection('string_applications').insertOne({
      orderId: new ObjectId(orderId), // 주문 ID를 함께 저장 (관계용)
      ...formData, // 신청서의 나머지 필드들
      createdAt: new Date(), // 신청 일시
    });

    //  해당 주문의 isStringServiceApplied 필드를 true로 갱신
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) }, // 주문 ID 기준
      { $set: { isStringServiceApplied: true } } // 상태를 true로 변경
    );

    // 성공 응답 반환
    return NextResponse.json({ success: true });
  } catch (error) {
    // 예외 발생 시 서버 로그 출력
    console.error('[STRING_SERVICE_APPLY]', error);

    // 클라이언트에 오류 응답 반환
    return new NextResponse('신청 처리 중 오류가 발생했습니다.', { status: 500 });
  }
}
