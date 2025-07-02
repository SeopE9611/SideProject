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

    //  비회원 주문일 때
    if (order.guestInfo) {
      customer = {
        name: order.guestInfo.name,
        email: order.guestInfo.email,
        phone: order.guestInfo.phone,

        // 주소는 guestInfo에는 없고, shippingInfo에만 존재하므로 여기서 가져옴
        // address + addressDetail을 합쳐서 하나의 전체 주소로 표현
        address: order.shippingInfo?.addressDetail ? `${order.shippingInfo.address} ${order.shippingInfo.addressDetail}` : order.shippingInfo?.address ?? '주소 없음',

        //  우편번호도 shippingInfo에만 존재
        postalCode: order.shippingInfo?.postalCode ?? '-',
      };

      //  회원 주문이지만 userSnapshot만 남아 있는 경우 (탈퇴 or 백업 상태)
    } else if (order.userSnapshot) {
      customer = {
        name: order.userSnapshot.name,
        email: order.userSnapshot.email,

        // 전화번호는 userSnapshot에는 없음 → shippingInfo에서 가져옴
        phone: order.shippingInfo?.phone ?? '-',

        // 주소도 마찬가지로 shippingInfo에서 가져와야 함
        address: order.shippingInfo?.addressDetail ? `${order.shippingInfo.address} ${order.shippingInfo.addressDetail}` : order.shippingInfo?.address ?? '주소 없음',

        // 우편번호 역시 shippingInfo에서
        postalCode: order.shippingInfo?.postalCode ?? '-',
      };

      // 완전한 회원 정보가 있는 경우 (회원 주문 & DB에도 사용자 존재)
    } else if (order.userId) {
      const user = await db.collection('users').findOne({ _id: new ObjectId(order.userId) });
      if (user) {
        customer = {
          name: user.name,
          email: user.email,
          phone: user.phone,

          // 이 경우 user.address가 존재하므로 그대로 사용 가능
          address: user.address ?? '주소 없음',

          // user 테이블에 postalCode 필드가 있는 경우에만 표시 (없으면 '-')
          postalCode: user.postalCode ?? '-',
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
