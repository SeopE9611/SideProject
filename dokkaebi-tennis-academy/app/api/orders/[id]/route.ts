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
    const enrichedItems = await Promise.all(
      (order.items as { productId: any; quantity: number }[]).map(async (item) => {
        // ObjectId 로 변환
        const prodId = item.productId instanceof ObjectId ? item.productId : new ObjectId(item.productId);

        // 상품 조회
        const prod = await db.collection('products').findOne({ _id: prodId });

        // prod 가 없으면 폴백
        if (!prod) {
          console.warn(`Product not found:`, prodId);
          return {
            id: prodId.toString(),
            name: '알 수 없는 상품',
            price: 0,
            mountingFee: 0,
            quantity: item.quantity,
          };
        }

        // 정상 데이터
        return {
          id: prod._id.toString(),
          name: prod.name,
          price: prod.price,
          mountingFee: prod.mountingFee ?? 0,
          quantity: item.quantity,
        };
      })
    );

    //  customer 통합 처리 시작
    // PATCH에서 $set: { customer: … } 한 값이 있으면 우선 사용
    let customer = (order as any).customer ?? null;

    // DB에 customer 필드가 없을 때만, 기존 guestInfo/userSnapshot/userId 로 로직 실행
    if (!customer) {
      if (order.guestInfo) {
        customer = {
          name: order.guestInfo.name,
          email: order.guestInfo.email,
          phone: order.guestInfo.phone,
          address: order.shippingInfo?.address ?? '주소 없음',
          addressDetail: order.shippingInfo?.addressDetail ?? '',
          postalCode: order.shippingInfo?.postalCode ?? '-',
        };
      } else if (order.userSnapshot) {
        customer = {
          name: order.userSnapshot.name,
          email: order.userSnapshot.email,
          phone: order.shippingInfo?.phone ?? '-',
          address: order.shippingInfo?.address ?? '주소 없음',
          addressDetail: order.shippingInfo?.addressDetail ?? '',
          postalCode: order.shippingInfo?.postalCode ?? '-',
        };
      } else if (order.userId) {
        const user = await db.collection('users').findOne({ _id: new ObjectId(order.userId) });
        if (user) {
          customer = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address ?? '주소 없음',
            addressDetail: order.shippingInfo?.addressDetail ?? '',
            postalCode: user.postalCode ?? '-',
          };
        }
      }
    }

    return NextResponse.json({
      ...order,
      customer,
      items: enrichedItems,
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
      paymentBank: order.paymentInfo?.bank ?? null,
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
    // 전체 payload를 body에 저장
    const body = await request.json();
    // 필요한 필드만 꺼내기
    const { status, cancelReason, cancelReasonDetail, payment, deliveryRequest, customer } = body;
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

    // 고객 정보 업데이트 분기
    if (customer) {
      const updateFields = {
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          addressDetail: customer.addressDetail,
          postalCode: customer.postalCode,
        },
      };
      const historyEntry = {
        status: '고객정보수정',
        date: new Date(),
        description: '고객 정보가 업데이트되었습니다.',
      };
      await orders.updateOne({ _id: new ObjectId(id) }, {
        $set: updateFields,
        $push: { history: historyEntry },
      } as any);
      return NextResponse.json({ ok: true });
    }

    // 2) 결제 금액 수정
    if (payment) {
      const { total } = payment;
      const historyEntry = {
        status: '결제금액수정',
        date: new Date(),
        description: `결제 금액이 ${total.toLocaleString()}원(으)로 수정되었습니다.`,
      };
      await orders.updateOne({ _id: new ObjectId(id) }, {
        $set: { totalPrice: total },
        $push: { history: historyEntry },
      } as any);
      return NextResponse.json({ ok: true });
    }

    // 3) 배송 요청사항 수정
    if (deliveryRequest !== undefined) {
      const historyEntry = {
        status: '배송요청사항수정',
        date: new Date(),
        description: `배송 요청사항이 수정되었습니다.`,
      };
      await orders.updateOne({ _id: new ObjectId(id) }, {
        $set: { 'shippingInfo.deliveryRequest': deliveryRequest },
        $push: { history: historyEntry },
      } as any);
      return NextResponse.json({ ok: true });
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
      $push: { history: historyEntry },
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
