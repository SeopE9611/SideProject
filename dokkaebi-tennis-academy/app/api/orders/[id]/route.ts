import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

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

    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;

    const isOwner = payload?.sub === order.userId?.toString();
    const isAdmin = payload?.role === 'admin';
    console.log('💡 raw cookie header:', _req.headers.get('cookie'));
    if (!isOwner && !isAdmin) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }
    //  customer 통합 처리 시작
    let customer = null;

    if (order.guestInfo) {
      customer = order.guestInfo;
    } else if (order.userSnapshot) {
      customer = {
        name: order.userSnapshot.name,
        email: order.userSnapshot.email,
        phone: '-', // 추가 필드 없음
        address: '-', // 익명화된 상태일 수 있음
      };
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
      shippingInfo: {
        ...order.shippingInfo,
        deliveryMethod: order.shippingInfo?.deliveryMethod ?? '택배수령',
        withStringService: order.shippingInfo?.withStringService ?? false,
        invoice: {
          courier: order.shippingInfo?.invoice?.courier ?? null,
          trackingNumber: order.shippingInfo?.invoice?.trackingNumber ?? null,
        },
      },
      paymentStatus: order.paymentStatus || '결제대기',
      paymentMethod: order.paymentInfo?.method ?? '결제방법 없음',
      total: order.totalPrice,
      date: order.createdAt,
      history: order.history ?? [],
      status: order.status,
      reason: order.cancelReason ?? null,
    });
  } catch (error) {
    console.error(' 주문 상세 조회 실패:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status, cancelReason, cancelReasonDetail } = await request.json();

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

    // 인증/보호 로직
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;

    const isOwner = payload?.sub === existing.userId?.toString();
    const isAdmin = payload?.role === 'admin';

    if (existing.userId && !isOwner && !isAdmin) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }

    if (existing.status === '취소') {
      return new NextResponse('취소된 주문입니다.', { status: 400 });
    }

    const updateFields: Record<string, any> = { status };
    if (status === '취소') {
      updateFields.cancelReason = cancelReason;
      if (cancelReason === '기타') {
        updateFields.cancelReasonDetail = cancelReasonDetail || '';
      }
    }

    if (['결제완료', '배송중', '배송완료'].includes(status)) {
      updateFields.paymentStatus = '결제완료';
    } else if (status === '대기중') {
      updateFields.paymentStatus = '결제대기';
    } else if (status === '취소') {
      updateFields.paymentStatus = '결제취소';
    } else if (status === '환불') {
      updateFields.paymentStatus = '환불';
    }

    const description = status === '취소' ? `주문이 취소되었습니다. 사유: ${cancelReason}${cancelReason === '기타' && cancelReasonDetail ? ` (${cancelReasonDetail})` : ''}` : `주문 상태가 '${status}'(으)로 변경되었습니다.`;

    const historyEntry = {
      status,
      date: new Date(),
      description,
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
