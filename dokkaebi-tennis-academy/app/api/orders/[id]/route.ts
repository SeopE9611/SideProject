import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { issuePassesForPaidOrder } from '@/lib/passes.service';
import jwt from 'jsonwebtoken';

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
    // console.log('raw cookie header:', _req.headers.get('cookie'));
    if (!isOwner && !isAdmin) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }
    const enrichedItems = await Promise.all(
      (order.items as { productId: any; quantity: number; kind?: 'product' | 'racket' }[]).map(async (item) => {
        const id = item.productId instanceof ObjectId ? item.productId : new ObjectId(item.productId);
        const kind = item.kind ?? 'product';

        // product
        if (kind === 'product') {
          const prod = await db.collection('products').findOne({ _id: id });

          if (!prod) {
            console.warn(`Product not found:`, id);
            return {
              id: id.toString(),
              name: '알 수 없는 상품',
              price: 0,
              mountingFee: 0,
              quantity: item.quantity,
              kind: 'product' as const,
            };
          }

          return {
            id: prod._id.toString(),
            name: prod.name,
            price: prod.price,
            mountingFee: prod.mountingFee ?? 0,
            quantity: item.quantity,
            kind: 'product' as const,
          };
        }

        // racket
        const racket = await db.collection('used_rackets').findOne({ _id: id });

        if (!racket) {
          console.warn(`Racket not found:`, id);
          return {
            id: id.toString(),
            name: '알 수 없는 라켓',
            price: 0,
            mountingFee: 0, // 라켓 자체는 장착비 없음
            quantity: item.quantity,
            kind: 'racket' as const,
          };
        }

        return {
          id: id.toString(),
          name: `${racket.brand} ${racket.model}`.trim(),
          price: racket.price ?? 0,
          mountingFee: 0,
          quantity: item.quantity,
          kind: 'racket' as const,
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

    // 스트링 서비스 신청 존재 여부
    // - draft(초안)와 취소(취소 완료)는 제외
    const linkedApp = await db.collection('stringing_applications').findOne(
      {
        orderId: new ObjectId(order._id),
        status: { $nin: ['draft', '취소'] },
      },
      { projection: { _id: 1 } }
    );

    const isStringServiceApplied = !!linkedApp;
    const stringingApplicationId = linkedApp?._id?.toString() ?? null;

    // 주문 전체에서 스트링 장착 상품이 몇 개인지 계산
    const totalSlots = enrichedItems.filter((item) => item.mountingFee > 0).reduce((sum, item) => sum + (item.quantity ?? 1), 0);

    // 이 주문으로 생성된 모든 스트링 신청서 조회 (취소 제외)
    const apps = await db
      .collection('stringing_applications')
      .find({
        orderId: order._id,
        status: { $ne: '취소' },
      })
      .toArray();

    // 각 신청서에서 사용된 슬롯(= 라켓 개수) 합산
    const usedSlots = apps.reduce((sum, app) => sum + (app.stringDetails?.racketLines?.length ?? 0), 0);

    // 남은 슬롯 계산 (음수 방지)
    const remainingSlots = Math.max(totalSlots - usedSlots, 0);

    // 이 주문과 연결된 신청서 요약 정보 배열
    const stringingApplications = apps.map((app: any) => ({
      id: app._id?.toString(),
      status: app.status ?? 'draft',
      createdAt: app.createdAt ?? null,
      racketCount: app.stringDetails?.racketLines?.length ?? 0,
    }));

    return NextResponse.json({
      ...order, // 원문은 펴주되,
      customer,
      items: enrichedItems,
      shippingInfo: {
        ...order.shippingInfo,
        deliveryMethod: order.shippingInfo?.deliveryMethod ?? '택배수령',
        withStringService: Boolean(order.shippingInfo?.withStringService), // 의사표시(체크박스)

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
      // 의사표시와 '실제 신청 존재'를 분리해 내려줌(여기가 핵심)
      isStringServiceApplied,
      stringingApplicationId,
      stringService: {
        totalSlots,
        usedSlots,
        remainingSlots,
      },
      // 주문 1건에 연결된 모든 신청서 요약 리스트
      stringingApplications,
    });
  } catch (error) {
    console.error(' 주문 상세 조회 실패:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    // 파라미터/바디 파싱
    const { id } = params; // 동적 세그먼트
    const body = await request.json(); // 요청 바디
    const { status, cancelReason, cancelReasonDetail, payment, deliveryRequest, customer } = body;

    if (!ObjectId.isValid(id)) {
      return new NextResponse('유효하지 않은 주문 ID입니다.', { status: 400 });
    }

    // DB/기존 주문 조회
    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection('orders');

    const _id = new ObjectId(id); // ObjectId 한 번만 생성해서 재사용
    const existing = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse('해당 주문을 찾을 수 없습니다.', { status: 404 });
    }

    // 인증/인가 가드
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    // access 우선
    let user: any = at ? verifyAccessToken(at) : null;

    // access 만료 시 refresh 보조 (쿠키 기반 JWT)
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        /* refresh도 실패시 아래에서 401 */
      }
    }

    if (!user?.sub) {
      return new NextResponse('인증이 필요합니다.', { status: 401 });
    }

    // 관리자 화이트리스트 ADMIN_EMAIL_WHITELIST="a@x.com,b@y.com"
    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isOwner = user?.sub === existing.userId?.toString();
    const isAdmin = user?.role === 'admin' || (user?.email && adminList.includes(user.email));

    // 주문에 userId가 있을 때만 소유자 체크, 없으면(비회원 주문 등) 관리자만 허용
    if (existing.userId ? !(isOwner || isAdmin) : !isAdmin) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }

    // 취소된 주문은 추가 변경 금지
    if (existing.status === '취소') {
      return new NextResponse('취소된 주문입니다.', { status: 400 });
    }

    // 고객정보 수정 분기
    // - 패스 발급은 여기서 하지 않도록 수정(아래 상태변경 분기로 이동)
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

      await orders.updateOne({ _id }, { $set: updateFields, $push: { history: historyEntry } } as any);

      // 연결된 스트링 신청서 동기화
      if ((existing as any).stringingApplicationId && ObjectId.isValid((existing as any).stringingApplicationId)) {
        const stringingColl = db.collection('stringing_applications');
        const appId = new ObjectId((existing as any).stringingApplicationId);
        const prevApp = await stringingColl.findOne({ _id: appId }); // 한 번만 읽어서 재사용

        await stringingColl.updateOne({ _id: appId }, {
          $set: {
            customer: {
              ...(prevApp?.customer ?? {}),
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              addressDetail: customer.addressDetail || '',
              postalCode: customer.postalCode,
            },
          },
          $push: {
            history: {
              status: '고객정보수정(동기화)',
              date: new Date(),
              description: '연결된 주문서에서 고객 정보를 동기화했습니다.',
            },
          },
        } as any);
      }

      return NextResponse.json({ ok: true });
    }

    // 결제 금액 수정
    if (payment) {
      const { total } = payment;
      const historyEntry = {
        status: '결제금액수정',
        date: new Date(),
        description: `결제 금액이 ${Number(total).toLocaleString()}원(으)로 수정되었습니다.`,
      };

      await orders.updateOne({ _id }, { $set: { totalPrice: total }, $push: { history: historyEntry } } as any);

      return NextResponse.json({ ok: true });
    }

    // 배송 요청사항 수정
    if (deliveryRequest !== undefined) {
      const historyEntry = {
        status: '배송요청사항수정',
        date: new Date(),
        description: '배송 요청사항이 수정되었습니다.',
      };

      await orders.updateOne({ _id }, { $set: { 'shippingInfo.deliveryRequest': deliveryRequest }, $push: { history: historyEntry } } as any);

      return NextResponse.json({ ok: true });
    }

    // 역행 여부 판정: 배송완료→배송중 같은 되돌림은 허용하되, 나중에 히스토리에 표시
    const __phaseIndex: Record<string, number> = {
      대기중: 0,
      결제완료: 1,
      배송중: 2,
      배송완료: 3,
      // '환불', '취소'는 종단 상태라 인덱스 필요 없음 (이미 서버에서 락)
    };

    const __prevStatus = String(existing.status); // 기존 문서의 상태
    const __nextStatus = String(status); // 이번에 바꾸려는 상태
    const __isBackward = (__phaseIndex[__nextStatus] ?? 0) < (__phaseIndex[__prevStatus] ?? 0);

    // 상태 변경 분기
    // - paymentStatus 계산/정규화를 한 곳에서 수행
    // - 이 시점에서만 패스 발급 멱등 트리거
    if (!status) {
      return new NextResponse('상태 값이 필요합니다.', { status: 400 });
    }

    const updateFields: Record<string, any> = { status };

    // 취소면 사유/상세 저장
    if (status === '취소') {
      updateFields.cancelReason = cancelReason;
      if (cancelReason === '기타') {
        updateFields.cancelReasonDetail = cancelReasonDetail || '';
      }
    }

    // 결제상태 정규화
    let newPaymentStatus: string | undefined = undefined;
    if (['결제완료', '배송중', '배송완료'].includes(status)) {
      newPaymentStatus = '결제완료';
    } else if (status === '대기중') {
      newPaymentStatus = '결제대기';
    } else if (status === '취소') {
      newPaymentStatus = '결제취소';
    } else if (status === '환불') {
      newPaymentStatus = '환불';
    }
    if (newPaymentStatus) {
      updateFields.paymentStatus = newPaymentStatus;
    }

    // 히스토리 메시지
    const description =
      __nextStatus === '취소'
        ? `주문이 취소되었습니다. 사유: ${cancelReason}${cancelReason === '기타' && cancelReasonDetail ? ` (${cancelReasonDetail})` : ''}`
        : __isBackward
        ? `주문 상태가 '${__prevStatus}' → '${__nextStatus}'(으)로 되돌려졌습니다.`
        : `주문 상태가 '${__nextStatus}'(으)로 변경되었습니다.`;

    const historyEntry = {
      status,
      date: new Date(),
      description,
    };

    // 상태 업데이트
    const result = await orders.updateOne({ _id }, { $set: updateFields, $push: { history: historyEntry } } as any);

    if (result.modifiedCount === 0) {
      return new NextResponse('주문 상태 업데이트에 실패했습니다.', { status: 500 });
    }

    // 패스 발급 멱등 트리거
    // 기존 결제상태가 결제완료가 아니었고, 이번에 결제완료가 되었다면 발급
    const becamePaid = (existing.paymentStatus ?? null) !== '결제완료' && newPaymentStatus === '결제완료';

    if (becamePaid) {
      try {
        const updatedOrder = await orders.findOne({ _id }); // 최신 문서 읽어서 전달
        if (updatedOrder) {
          await issuePassesForPaidOrder(db, updatedOrder);
        }
      } catch (e) {
        console.error('issuePassesForPaidOrder error:', e);
        // 필요하면 여기서 history에 "발급 실패" 로그를 더 남길 수 있음
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/orders/[id] 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
