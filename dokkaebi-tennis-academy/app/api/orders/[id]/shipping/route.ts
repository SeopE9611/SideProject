import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// 배송 방법 한글 매핑
const shippingMethodMap: Record<string, string> = {
  standard: '일반 배송',
  express: '빠른 배송',
  premium: '퀵 배송',
  pickup: '매장 수령',
  visit: '방문 수령',
};

// PATCH 메서드 정의
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // URL 파라미터에서 주문 ID 추출
    const { id } = await context.params;

    // 요청 Body(JSON)를 파싱하여 가져옴
    const body = await req.json();

    // 배송 방법과 예상 수령일을 Body에서 구조분해 할당
    const { shippingMethod, estimatedDate } = body;

    // 필수 항목 누락 여부 확인 → 유효성 검사
    if (!shippingMethod || !estimatedDate) {
      return NextResponse.json({ success: false, message: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 날짜 포맷을 한글로 변환 (예: 2025년 6월 3일)
    const formattedDate = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(estimatedDate));

    // MongoDB 클라이언트 연결 (clientPromise는 연결 재사용 지원)
    const client = await clientPromise;
    const db = client.db();

    // 배송 정보 + 처리 이력 동시 업데이트
    await db.collection('orders').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          'shippingInfo.shippingMethod': shippingMethod, // 배송 방법
          'shippingInfo.estimatedDate': estimatedDate, // 예상 수령일
        },
        $push: {
          history: {
            $each: [
              {
                status: '배송정보변경',
                date: new Date().toISOString(),
                description: `배송 방법을 "${shippingMethodMap[shippingMethod]}"(으)로 변경하고, 예상 수령일을 "${formattedDate}"로 설정했습니다.`,
              },
            ],
          },
        } as any,
      }
    );

    // 성공 응답 반환
    return NextResponse.json({
      success: true,
      updated: { shippingMethod, estimatedDate },
    });
  } catch (error) {
    // 예외 처리: 서버 에러 로그 + 클라이언트 응답
    console.error('배송 정보 업데이트 실패:', error);
    return NextResponse.json({ success: false, message: '서버 에러 발생' }, { status: 500 });
  }
}
