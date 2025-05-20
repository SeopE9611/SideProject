import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new NextResponse('유효하지 않은 주문 ID입니다.', { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });

    if (!order) {
      return new NextResponse('주문을 찾을 수 없습니다.', { status: 404 });
    }

    //  customer 통합 처리 시작
    let customer = null;

    if (order.guestInfo) {
      customer = order.guestInfo;
    } else if (order.userId) {
      const user = await db.collection('users').findOne({ _id: new ObjectId(order.userId) });
      if (user) {
        customer = {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
        };
      }
    }
    return NextResponse.json({
      ...order,
      customer,
      shipping: order.shippingInfo, // shipping 필드 추가
      paymentStatus: '대기', // 또는 "결제대기" 등 하드코딩 or 계산 로직 필요
      paymentMethod: order.paymentInfo?.method ?? '결제방법 없음',
      total: order.totalPrice,
      date: order.createdAt,
      history: order.history ?? [],
    });
  } catch (error) {
    console.error(' 주문 상세 조회 실패:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return new NextResponse('상태 값이 누락되었습니다.', { status: 400 });
    }

    const result = await db.collection('orders').updateOne({ _id: new ObjectId(id) }, { $set: { status } });

    if (result.modifiedCount === 0) {
      return new NextResponse('업데이트된 문서가 없습니다.', { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(' 주문 상태 변경 실패:', error);
    return new NextResponse('서버 오류', { status: 500 });
  }
}
