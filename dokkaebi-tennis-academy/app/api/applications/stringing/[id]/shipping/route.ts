import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db();

    const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
    if (!app) {
      return new NextResponse('신청서를 찾을 수 없습니다.', { status: 404 });
    }

    const newShippingInfo = body.shippingInfo;
    if (!newShippingInfo) {
      return new NextResponse('배송 정보가 필요합니다.', { status: 400 });
    }

    // 기존 배송 정보와 병합
    const mergedShippingInfo = {
      ...app.shippingInfo, // 기존 값
      ...newShippingInfo, // 새 값으로 덮어쓰기
    };

    // 스트링 신청서 업데이트
    await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, { $set: { shippingInfo: mergedShippingInfo } });

    // 연결된 주문도 업데이트
    if (app.orderId) {
      const order = await db.collection('orders').findOne({ _id: new ObjectId(app.orderId) });
      const orderShipping = order?.shippingInfo || {};

      const mergedOrderShippingInfo = {
        ...orderShipping,
        ...newShippingInfo,
      };

      await db.collection('orders').updateOne({ _id: new ObjectId(app.orderId) }, { $set: { shippingInfo: mergedOrderShippingInfo } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/applications/stringing/[id]/shipping] error:', err);
    return new NextResponse('서버 오류 발생', { status: 500 });
  }
}
