import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { normalizeOrderShippingMethod } from '@/lib/order-shipping';
import { z } from 'zod';

// 배송 방법 한글 매핑
const shippingMethodMap: Record<string, string> = {
  courier: '택배 배송',
  delivery: '택배 배송', // 레거시(호환)
  quick: '퀵 배송 (당일)',
  visit: '방문 수령',
};

/**
 * PATCH body 최소 스키마
 * - 기존 로직(추가 검증/정규화)은 그대로 두고,
 *   "깨진 JSON / 필드 누락"만 조기에 400으로 정리하기 위한 최소 가드.
 */
const BodySchema = z
  .object({
    shippingMethod: z.string().min(1),
    estimatedDate: z.string().min(1),
    courier: z.any().optional(),
    trackingNumber: z.any().optional(),
  })
  .passthrough();

// PATCH 메서드 정의
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  //  인증 처리
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  // 토큰이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 401로 정리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }
  if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  // 관리자 전용 가드 (이 API는 admin 배송정보 업데이트 화면에서 호출됨)
  if (payload?.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  try {
    // URL 파라미터에서 주문 ID 추출
    const { id } = await context.params;
    // ObjectId 유효성(잘못된 id → 500 방지)
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
    }
    const orderId = new ObjectId(id);

    // MongoDB 클라이언트 연결 (clientPromise는 연결 재사용 지원)
    // const client = await clientPromise;
    // const db = client.db();
    const db = (await clientPromise).db();

    // 요청 Body(JSON)를 파싱하여 가져오고 배송 방법과 예상 수령일, 운송장 정보를 Body에서 구조분해 할당
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'INVALID_JSON' }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'INVALID_BODY' }, { status: 400 });
    }

    const { shippingMethod, estimatedDate, courier, trackingNumber } = parsed.data;
    const normalizedMethod = normalizeOrderShippingMethod(shippingMethod);

    const order = await db.collection('orders').findOne({
      _id: orderId,
    });
    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }
    const setOps: any = {
      // 표준값으로 저장 (courier | quick | visit)
      'shippingInfo.shippingMethod': normalizedMethod ?? shippingMethod,
      'shippingInfo.estimatedDate': estimatedDate,
    };

    if (['취소', '결제취소'].includes(order.status)) {
      return new NextResponse('취소된 주문은 배송 정보를 수정할 수 없습니다.', { status: 403 });
    }

    // 필수 항목 누락 여부 확인 → 유효성 검사
    if (!normalizedMethod || !estimatedDate) {
      return NextResponse.json({ success: false, message: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 날짜 유효성(Invalid Date 방지)
    const est = new Date(estimatedDate);
    if (!Number.isFinite(est.getTime())) {
      return NextResponse.json({ success: false, message: '예상 수령일 값이 올바르지 않습니다.' }, { status: 400 });
    }
    // 택배(courier)일 때만 운송장 필수
    const isCourier = normalizedMethod === 'courier';
    if (isCourier) {
      if (!courier || !String(courier).trim()) {
        return NextResponse.json({ success: false, message: '택배사를 선택해주세요.' }, { status: 400 });
      }
      if (!trackingNumber || !String(trackingNumber).trim()) {
        return NextResponse.json({ success: false, message: '운송장 번호를 입력해주세요.' }, { status: 400 });
      }
    }

    // 날짜 포맷을 한글로 변환 (예: 2025년 6월 3일)
    const formattedDate = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(est);

    let updateResult;
    if (isCourier) {
      // 택배배송(courier)일 때만 invoice 세팅
      setOps['shippingInfo.invoice'] = {
        courier: String(courier).trim(),
        trackingNumber: String(trackingNumber).trim(),
      };

      updateResult = await db.collection('orders').updateOne({ _id: orderId }, { $set: setOps });
    } else {
      // 택배배송이 아니면 invoice 전체 필드 제거
      updateResult = await db.collection('orders').updateOne(
        { _id: orderId },
        {
          $set: setOps,
          $unset: { 'shippingInfo.invoice': '' },
        },
      );
    }

    // 처리 이력
    await db.collection('orders').updateOne({ _id: orderId }, {
      $push: {
        history: {
          status: '배송정보변경',
          date: new Date().toISOString(),
          description: `배송 방법을 "${shippingMethodMap[normalizedMethod] ?? '정보 없음'}"으로 변경하고, 예상 수령일을 "${formattedDate}"로 설정했습니다.`,
        },
      },
    } as any);

    //  수정 성공 여부 전달
    return NextResponse.json({ ok: updateResult.modifiedCount > 0 });
  } catch (error) {
    console.error('[ORDER_SHIPPING_PATCH]', error);
    return NextResponse.json({ error: '배송 정보 업데이트에 실패했습니다.' }, { status: 500 });
  }
}
