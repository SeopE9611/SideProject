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

    // MongoDB 클라이언트 연결 (clientPromise는 연결 재사용 지원)
    // const client = await clientPromise;
    // const db = client.db();
    const db = (await clientPromise).db();

    // 요청 Body(JSON)를 파싱하여 가져오고 배송 방법과 예상 수령일, 운송장 정보를 Body에서 구조분해 할당
    const { shippingMethod, estimatedDate, courier, trackingNumber } = await req.json();

    const order = await db.collection('orders').findOne({
      _id: new ObjectId(id),
    });
    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }
    const updateFields: any = {
      'shippingInfo.shippingMethod': shippingMethod,
      'shippingInfo.estimatedDate': estimatedDate,
    };

    // 필수 항목 누락 여부 확인 → 유효성 검사
    if (!shippingMethod || !estimatedDate) {
      return NextResponse.json({ success: false, message: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    const updatedShippingInfo = {
      ...(order.shippingInfo ?? {}),
      shippingMethod,
      estimatedDate,
      ...(courier && trackingNumber
        ? {
            invoice: {
              courier,
              trackingNumber,
            },
          }
        : {}),
    };

    // 날짜 포맷을 한글로 변환 (예: 2025년 6월 3일)
    const formattedDate = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(estimatedDate));

    //  DB 업데이트 실행
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          shippingInfo: updatedShippingInfo,
        },
      }
    );

    // PATCH: 배송 정보 + 운송장 정보 업데이트 + 처리이력 기록

    const shippingUpdateResult = await db.collection('orders').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          shippingInfo: updatedShippingInfo,
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

    //  수정 성공 여부 전달
    return NextResponse.json({ ok: shippingUpdateResult.modifiedCount > 0 });
  } catch (error) {
    console.error('[ORDER_SHIPPING_PATCH]', error);
    return NextResponse.json({ error: '배송 정보 업데이트에 실패했습니다.' }, { status: 500 });
  }
}
