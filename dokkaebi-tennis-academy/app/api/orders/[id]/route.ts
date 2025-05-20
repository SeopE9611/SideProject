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
    const { status, reason } = await request.json();

    if (!ObjectId.isValid(id)) {
      return new NextResponse('유효하지 않은 주문 ID입니다.', { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection('orders');

    const existing = await orders.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return new NextResponse('해당 주문을 찾을 수 없습니다.', { status: 404 });
    }

    if (existing.status === '취소') {
      return new NextResponse('이미 취소된 주문입니다.', { status: 400 });
    }

    const updateFields: Record<string, any> = { status };
    if (status === '취소' && reason) {
      updateFields.cancelReason = reason;
    }

    const historyEntry = {
      status,
      date: new Date(),
      description: status === '취소' ? `주문이 취소되었습니다. 사유: ${reason}` : `주문 상태가 '${status}'(으)로 변경되었습니다.`,
    };

    const result = await orders.updateOne({ _id: new ObjectId(id) }, {
      $set: updateFields,
      $push: {
        history: {
          $each: [historyEntry],
        },
      },
    } as any);

    if (result.modifiedCount === 0) {
      return new NextResponse('주문 상태 업데이트에 실패했습니다.', { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/orders/[id] 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
