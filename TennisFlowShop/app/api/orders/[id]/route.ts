import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken, verifyOrderAccessToken } from '@/lib/auth.utils';
import { issuePassesForPaidOrder } from '@/lib/passes.service';
import jwt from 'jsonwebtoken';
import { deductPoints, grantPoints } from '@/lib/points.service';
import { z } from 'zod';
import { getAdminCancelPolicyMessage, isAdminCancelableOrderStatus } from '@/lib/orders/cancel-refund-policy';

// 고객정보 서버 검증(관리자 PATCH)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhoneDigits = (digits: string) => digits.length === 10 || digits.length === 11;

const customerSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: '이름은 필수입니다.' })
    .refine((s) => s.length <= 50, { message: '이름은 50자 이내로 입력해주세요.' }),
  email: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: '이메일은 필수입니다.' })
    .refine((s) => EMAIL_RE.test(s), { message: '유효한 이메일 주소를 입력해주세요.' })
    .refine((s) => s.length <= 254, { message: '이메일이 너무 깁니다.' }),
  phone: z
    .string()
    .transform((v) => onlyDigits(v))
    .refine((d) => isValidKoreanPhoneDigits(d), { message: '전화번호는 숫자 10~11자리만 입력해주세요.' }),
  postalCode: z
    .string()
    .transform((v) => onlyDigits(v))
    .refine((d) => d.length === 5, { message: '우편번호는 숫자 5자리만 입력해주세요.' }),
  address: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: '주소는 필수입니다.' })
    .refine((s) => s.length <= 200, { message: '주소는 200자 이내로 입력해주세요.' }),
  addressDetail: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= 100, { message: '상세주소는 100자 이내로 입력해주세요.' }),
});

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
    // accessToken이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 "비로그인" 취급
    let payload: any = null;
    try {
      payload = token ? verifyAccessToken(token) : null;
    } catch {
      payload = null;
    }

    const isOwner = payload?.sub === order.userId?.toString();
    const isAdmin = payload?.role === 'admin';
    // console.log('raw cookie header:', _req.headers.get('cookie'));
    const oax = cookieStore.get('orderAccessToken')?.value ?? null;
    // orderAccessToken도 깨졌을 수 있으므로 throw 방어
    let guestClaims: any = null;
    try {
      guestClaims = oax ? verifyOrderAccessToken(oax) : null;
    } catch {
      guestClaims = null;
    }
    const isGuestOrder = !order.userId || (order as any).guest === true;
    const guestOwnsOrder = !!(isGuestOrder && guestClaims && guestClaims.orderId === String(order._id));

    if (!isOwner && !isAdmin && !guestOwnsOrder) {
      return new NextResponse('권한이 없습니다.', { status: 403 });
    }
    const enrichedItems = await Promise.all(
      (order.items as { productId: any; quantity: number; kind?: 'product' | 'racket' }[]).map(async (item) => {
        const kind = item.kind ?? 'product';

        // productId가 오염/레거시 데이터일 때 new ObjectId에서 500이 나지 않도록 방어
        const raw = item.productId;
        const idStr = raw instanceof ObjectId ? raw.toString() : String(raw ?? '');
        const oid = raw instanceof ObjectId ? raw : ObjectId.isValid(idStr) ? new ObjectId(idStr) : null;
        if (!oid) {
          return {
            id: idStr,
            name: kind === 'racket' ? '알 수 없는 라켓' : '알 수 없는 상품',
            price: 0,
            mountingFee: 0,
            quantity: item.quantity,
            kind,
          };
        }

        // product
        if (kind === 'product') {
          const prod = await db.collection('products').findOne({ _id: oid });

          if (!prod) {
            console.warn(`상품을 찾을 수 없음:`, oid);
            return {
              id: oid.toString(),
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
        const racket = await db.collection('used_rackets').findOne({ _id: oid });

        if (!racket) {
          console.warn(`라켓으 찾을 수 없음:`, oid);
          return {
            id: oid.toString(),
            name: '알 수 없는 라켓',
            price: 0,
            mountingFee: 0, // 라켓 자체는 장착비 없음
            quantity: item.quantity,
            kind: 'racket' as const,
          };
        }

        return {
          id: oid.toString(),
          name: `${racket.brand} ${racket.model}`.trim(),
          price: racket.price ?? 0,
          mountingFee: 0,
          quantity: item.quantity,
          kind: 'racket' as const,
        };
      }),
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
      { projection: { _id: 1 } },
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 파라미터/바디 파싱
    const { id } = await params; // 동적 세그먼트
    // 깨진 JSON이면 throw → 500 방지 (400으로 정리)
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'INVALID_JSON' }, { status: 400 });
    }
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
    // accessToken이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 인증 실패로 정리
    let user: any = null;
    try {
      user = at ? verifyAccessToken(at) : null;
    } catch {
      user = null;
    }

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
      const parsed = customerSchema.safeParse(customer);
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        return NextResponse.json(
          {
            ok: false,
            message: 'INVALID_CUSTOMER',
            error: flat.formErrors?.[0] ?? '고객 정보가 올바르지 않습니다.',
            fieldErrors: flat.fieldErrors,
          },
          { status: 400 },
        );
      }

      const c = parsed.data;

      const updateFields = {
        customer: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          addressDetail: c.addressDetail,
          postalCode: c.postalCode,
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
              name: c.name,
              email: c.email,
              phone: c.phone,
              address: c.address,
              addressDetail: c.addressDetail || '',
              postalCode: c.postalCode,
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
      const totalNum = Number(total);
      if (!Number.isFinite(totalNum) || totalNum < 0) {
        return NextResponse.json({ ok: false, message: 'INVALID_PAYMENT_TOTAL' }, { status: 400 });
      }
      const historyEntry = {
        status: '결제금액수정',
        date: new Date(),
        description: `결제 금액이 ${totalNum.toLocaleString()}원(으)로 수정되었습니다.`,
      };

      await orders.updateOne({ _id }, { $set: { totalPrice: totalNum }, $push: { history: historyEntry } } as any);

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
    // status 유효성(현재 프로젝트에서 사용하는 상태만 허용)
    if (typeof status !== 'string' || status.trim().length === 0) {
      return new NextResponse('상태 값이 필요합니다.', { status: 400 });
    }
    const nextStatus = status.trim();
    const ALLOWED_STATUS = new Set(['대기중', '결제완료', '배송중', '배송완료', '취소', '환불']);
    if (!ALLOWED_STATUS.has(nextStatus)) {
      return new NextResponse('허용되지 않은 상태 값입니다.', { status: 400 });
    }

    const __nextStatus = nextStatus; // 이번에 바꾸려는 상태
    const __isBackward = (__phaseIndex[__nextStatus] ?? 0) < (__phaseIndex[__prevStatus] ?? 0);

    // 상태 변경 분기
    // - paymentStatus 계산/정규화를 한 곳에서 수행
    // - 이 시점에서만 패스 발급 멱등 트리거
    const updateFields: Record<string, any> = { status: nextStatus };

    // 취소면 사유/상세 저장
    if (nextStatus === '취소') {
      if (!isAdminCancelableOrderStatus(existing.status)) {
        return new NextResponse(getAdminCancelPolicyMessage(existing.status), { status: 400 });
      }

      const reason = typeof cancelReason === 'string' ? cancelReason.trim() : '';
      if (!reason) {
        return new NextResponse('취소 사유가 필요합니다.', { status: 400 });
      }
      updateFields.cancelReason = reason;
      if (reason === '기타') {
        const detail = typeof cancelReasonDetail === 'string' ? cancelReasonDetail.trim() : '';
        if (!detail) return new NextResponse('기타 사유 상세가 필요합니다.', { status: 400 });
        if (detail.length > 200) return new NextResponse('기타 사유 상세는 200자 이내로 입력해주세요.', { status: 400 });
        updateFields.cancelReasonDetail = detail;
      }
    }

    // 결제상태 정규화
    let newPaymentStatus: string | undefined = undefined;
    if (['결제완료', '배송중', '배송완료'].includes(nextStatus)) {
      newPaymentStatus = '결제완료';
    } else if (nextStatus === '대기중') {
      newPaymentStatus = '결제대기';
    } else if (nextStatus === '취소') {
      newPaymentStatus = '결제취소';
    } else if (nextStatus === '환불') {
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
      status: nextStatus,
      date: new Date(),
      description,
    };

    // 상태 업데이트
    const result = await orders.updateOne({ _id }, { $set: updateFields, $push: { history: historyEntry } } as any);

    if (result.modifiedCount === 0) {
      return new NextResponse('주문 상태 업데이트에 실패했습니다.', { status: 500 });
    }

    // 패스 발급 멱등 트리거
    const becamePaid = (existing.paymentStatus ?? null) !== '결제완료' && newPaymentStatus === '결제완료';

    if (becamePaid) {
      try {
        const updatedOrder = await orders.findOne({ _id }); // 최신 문서 읽어서 전달
        if (updatedOrder) {
          await issuePassesForPaidOrder(db, updatedOrder);
          // - 포인트는 "구매확정" 시점(/api/orders/[id]/confirm)에서만 지급
          // - 중복 지급 방지는 points_transactions.refKey로 멱등 보장
        }
      } catch (e) {
        console.error('issuePassesForPaidOrder error:', e);
      }
    }

    // 포인트 사용(차감) 복원:
    // - 주문 생성 시점에 pointsToUse를 즉시 차감하기 때문에,
    //   결제대기 상태에서 '취소'가 발생하면 사용 포인트를 되돌려줘야 함.
    // - (중요) 멱등키(refKey)를 사용해 중복 복원을 방지
    const becameCanceledBeforePaid = (existing.paymentStatus ?? null) !== '결제완료' && newPaymentStatus === '결제취소';

    if (becameCanceledBeforePaid) {
      try {
        const updatedOrder = await orders.findOne({ _id });
        if (!updatedOrder) return NextResponse.json({ ok: true });

        const uid = (updatedOrder as any).userId;
        const uidStr = uid ? String(uid) : '';
        if (!ObjectId.isValid(uidStr)) return NextResponse.json({ ok: true });

        const orderObjectId = String((updatedOrder as any)._id);

        const txCol = db.collection('points_transactions');
        const spendRefKey = `order:${orderObjectId}:spend`;
        const restoreRefKey = `order:${orderObjectId}:spend_reversal`;

        // 가능한 한 "실제로 차감된 amount"를 원장에서 찾아 복원(주문 문서 필드보다 안전)
        const spendTx = await txCol.findOne({ refKey: spendRefKey, status: 'confirmed' });
        const amountFromTx = Math.abs(Number((spendTx as any)?.amount ?? 0));

        const amountFromOrder = Number((updatedOrder as any).pointsUsed ?? (updatedOrder as any).paymentInfo?.pointsUsed ?? 0);
        const amountToRestore = Math.max(0, Math.trunc(amountFromTx || amountFromOrder || 0));

        if (amountToRestore <= 0) return NextResponse.json({ ok: true });

        await grantPoints(db, {
          userId: new ObjectId(uidStr),
          amount: amountToRestore,
          type: 'reversal',
          status: 'confirmed',
          refKey: restoreRefKey, // 복원 멱등키
          reason: `주문 취소로 사용 포인트 복원 (${(updatedOrder as any).orderId ?? ''})`.trim(),
          ref: { orderId: (updatedOrder as any)._id },
        });
      } catch (e: any) {
        // 복원 실패가 "주문 취소" 자체를 막으면 UX 최악 → 로그만 남기고 종료
        console.error('restore spend points (before paid) error:', e);
      }
    }

    const becameCanceledOrRefunded = (existing.paymentStatus ?? null) === '결제완료' && ['결제취소', '환불'].includes(newPaymentStatus ?? '');

    if (becameCanceledOrRefunded) {
      try {
        const updatedOrder = await orders.findOne({ _id });
        if (!updatedOrder) return NextResponse.json({ ok: true });

        const uid = (updatedOrder as any).userId;
        const uidStr = uid ? String(uid) : '';
        if (!ObjectId.isValid(uidStr)) return NextResponse.json({ ok: true });

        const orderObjectId = String((updatedOrder as any)._id);
        const rewardRefKey = `order_reward:${orderObjectId}`;
        const revokeRefKey = `order_reward_revoke:${orderObjectId}`; // 회수 멱등키

        // "얼마를 회수해야 하는지"는 가능하면 적립 트랜잭션을 찾아서 그 amount를 쓰는 게 제일 안전
        const txCol = db.collection('points_transactions');

        // (1) 사용 포인트 복원 (이미 복원된 경우 refKey 유니크로 자동 스킵)
        const spendRefKey = `order:${orderObjectId}:spend`;
        const restoreRefKey = `order:${orderObjectId}:spend_reversal`;

        const spendTx = await txCol.findOne({ refKey: spendRefKey, status: 'confirmed' });
        const amountFromTx = Math.abs(Number((spendTx as any)?.amount ?? 0));

        const amountFromOrder = Number((updatedOrder as any).pointsUsed ?? (updatedOrder as any).paymentInfo?.pointsUsed ?? 0);
        const amountToRestore = Math.max(0, Math.trunc(amountFromTx || amountFromOrder || 0));

        if (amountToRestore > 0) {
          await grantPoints(db, {
            userId: new ObjectId(uidStr),
            amount: amountToRestore,
            type: 'reversal',
            status: 'confirmed',
            refKey: restoreRefKey,
            reason: `주문 취소/환불로 사용 포인트 복원 (${(updatedOrder as any).orderId ?? ''})`.trim(),
            ref: { orderId: (updatedOrder as any)._id },
          });
        }

        const rewardTx = await txCol.findOne({ refKey: rewardRefKey, status: 'confirmed' });

        // 적립이 없으면 회수할 것도 없음
        const amountToRevoke = Number((rewardTx as any)?.amount ?? 0);
        if (amountToRevoke <= 0) return NextResponse.json({ ok: true });

        await deductPoints(db, {
          userId: new ObjectId(uidStr),
          amount: amountToRevoke,
          type: 'order_reward', // 같은 타입으로 “-amount” 기록이 남게 됨
          status: 'confirmed',
          refKey: revokeRefKey, // 회수 멱등
          reason: `주문 취소/환불로 적립 포인트 회수 (${(updatedOrder as any).orderId ?? ''})`.trim(),
          ref: { orderId: (updatedOrder as any)._id },
          // 적립 포인트를 이미 사용한 상태에서도 환불이 발생할 수 있음 → 회수는 음수 잔액을 허용(정책)
          allowNegativeBalance: true,
        });
      } catch (e: any) {
        // 여기서 throw로 터뜨리면 "주문 취소/환불" 자체가 실패하는 최악의 UX가 됨 → 로그만 남기고 종료
        console.error('revoke order_reward error:', e);

        // 포인트 회수 실패를 주문 히스토리에 남기고 싶으면 history push 추가
        // - INSUFFICIENT_POINTS(이미 사용됨) 같은 케이스는 "관리자 확인 필요"로 남겨두는 게 현실적
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/orders/[id] 오류:', error);
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 });
  }
}
