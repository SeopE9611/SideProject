import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { isVisitPickupOrder, normalizeOrderShippingMethod } from '@/lib/order-shipping';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { normalizeOrderStatus, normalizePaymentStatus } from '@/lib/admin-ops-normalize';

const shippingMethodMap: Record<string, string> = {
  courier: '택배 배송',
  delivery: '택배 배송',
  quick: '퀵 배송 (당일)',
  visit: '방문 수령',
};

const BodySchema = z
  .object({
    shippingMethod: z.string().min(1),
    estimatedDate: z.string().min(1),
    courier: z.any().optional(),
    trackingNumber: z.any().optional(),
  })
  .passthrough();

const ORDER_TERMINAL_STATUSES = new Set(['취소', '결제취소', '환불', '구매확정', '완료']);
const ORDER_SHIPPING_PHASE_STATUSES = new Set(['배송중', '배송완료']);

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'INVALID_JSON' }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'INVALID_BODY' }, { status: 400 });

    const db = (await clientPromise).db();
    const orderId = new ObjectId(id);
    const { shippingMethod, estimatedDate, courier, trackingNumber } = parsed.data;
    const normalizedMethod = normalizeOrderShippingMethod(shippingMethod);

    const order: any = await db.collection('orders').findOne({ _id: orderId });
    if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    if (['취소', '결제취소'].includes(order.status)) {
      return NextResponse.json({ ok: false, message: '취소된 주문은 배송 정보를 수정할 수 없습니다.' }, { status: 403 });
    }
    if (!normalizedMethod || !estimatedDate) return NextResponse.json({ success: false, message: '모든 필드를 입력해주세요.' }, { status: 400 });

    const prevShippingInfo: any = order?.shippingInfo ?? {};
    const prevMethodRaw = prevShippingInfo?.shippingMethod ?? '';
    const prevEstimatedDate = String(prevShippingInfo?.estimatedDate ?? '').trim();
    const prevCourier = String(prevShippingInfo?.invoice?.courier ?? '').trim();
    const prevTracking = String(prevShippingInfo?.invoice?.trackingNumber ?? '').trim();
    const isRegistered = Boolean(String(prevMethodRaw ?? '').trim() || prevEstimatedDate || prevCourier || prevTracking);

    const isOriginalVisitPickup = isVisitPickupOrder(order?.shippingInfo);
    // 정책: 체크아웃에서 확정된 주문 성격(방문/배송)을 관리자 폼에서 바꿀 수 없다.
    if (isOriginalVisitPickup && normalizedMethod !== 'visit') {
      return NextResponse.json({ ok: false, message: '방문 수령 주문은 배송 방식 변경이 불가합니다. 예외 전환은 별도 관리자 절차를 통해 진행해주세요.' }, { status: 400 });
    }
    if (!isOriginalVisitPickup && normalizedMethod === 'visit') {
      return NextResponse.json({ ok: false, message: '일반 배송 주문은 방문 수령으로 변경할 수 없습니다.' }, { status: 400 });
    }

    const est = new Date(estimatedDate);
    if (!Number.isFinite(est.getTime())) return NextResponse.json({ success: false, message: '예상 수령일 값이 올바르지 않습니다.' }, { status: 400 });

    const isCourier = normalizedMethod === 'courier';
    if (isCourier) {
      if (!courier || !String(courier).trim()) return NextResponse.json({ success: false, message: '택배사를 선택해주세요.' }, { status: 400 });
      if (!trackingNumber || !String(trackingNumber).trim()) return NextResponse.json({ success: false, message: '운송장 번호를 입력해주세요.' }, { status: 400 });
    }

    const setOps: any = {
      'shippingInfo.shippingMethod': normalizedMethod ?? shippingMethod,
      'shippingInfo.estimatedDate': estimatedDate,
    };

    const nextMethod = String(normalizedMethod ?? shippingMethod ?? '').trim();
    const nextEstimatedDate = String(estimatedDate ?? '').trim();
    const nextCourier = isCourier ? String(courier ?? '').trim() : '';
    const nextTracking = isCourier ? String(trackingNumber ?? '').trim() : '';
    const isFirstShippingRegistration = !isRegistered && Boolean(nextMethod || nextEstimatedDate || nextCourier || nextTracking);

    const currentStatusRaw = String(order?.status ?? '').trim();
    const currentStatus = normalizeOrderStatus(currentStatusRaw);
    const paymentStatus = normalizePaymentStatus(String(order?.paymentStatus ?? order?.paymentInfo?.status ?? '').trim());
    const isPaymentCompleted = paymentStatus === '결제완료' || currentStatus === '결제완료';
    const shouldAutoTransitToShipping =
      !isOriginalVisitPickup &&
      isFirstShippingRegistration &&
      isPaymentCompleted &&
      !ORDER_TERMINAL_STATUSES.has(currentStatus) &&
      !ORDER_SHIPPING_PHASE_STATUSES.has(currentStatus);

    const formattedDate = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(est);
    const isVisitPickup = isOriginalVisitPickup || normalizedMethod === 'visit';
    const methodLabel = shippingMethodMap[normalizedMethod] ?? '정보 없음';
    const historyDescription = isVisitPickup
      ? isRegistered
        ? `수령/배송 방법을 "${methodLabel}"으로 변경하고, 예상 수령일을 "${formattedDate}"로 수정했습니다.`
        : `수령/배송 방법을 "${methodLabel}"으로 설정하고, 예상 수령일을 "${formattedDate}"로 등록했습니다.`
      : isRegistered
        ? `배송 방법을 "${methodLabel}"으로 변경하고, 예상 수령일을 "${formattedDate}"로 수정했습니다.`
        : `배송 방법을 "${methodLabel}"으로 설정하고, 예상 수령일을 "${formattedDate}"로 등록했습니다.`;

    const historyStatus = isVisitPickup ? (isRegistered ? '방문수령정보수정' : '방문수령정보등록') : isRegistered ? '배송정보수정' : '배송정보등록';

    const historyEntries: any[] = [
      {
        status: historyStatus,
        date: new Date().toISOString(),
        description: historyDescription,
      },
    ];

    if (shouldAutoTransitToShipping) {
      historyEntries.push({
        status: '배송중',
        date: new Date().toISOString(),
        description: '최초 배송정보 등록이 확인되어 주문 상태가 자동으로 배송중으로 전환되었습니다.',
      });
      setOps.status = '배송중';
    }

    const updateDoc: any = {
      $set: setOps,
      $push: {
        history: {
          $each: historyEntries,
        },
      },
    };

    if (isCourier) {
      setOps['shippingInfo.invoice'] = { courier: String(courier).trim(), trackingNumber: String(trackingNumber).trim() };
    } else {
      updateDoc.$unset = { 'shippingInfo.invoice': '' };
    }

    await db.collection('orders').updateOne({ _id: orderId }, updateDoc);

    await appendAdminAudit(
      guard.db,
      {
        type: 'admin.orders.shipping.patch',
        actorId: guard.admin._id,
        targetId: orderId,
        message: shouldAutoTransitToShipping
          ? isRegistered
            ? '주문 배송정보 수정 및 자동 상태 전환'
            : '주문 배송정보 등록 및 자동 상태 전환'
          : isRegistered
            ? '주문 배송정보 수정'
            : '주문 배송정보 등록',
        diff: {
          shippingMethod: normalizedMethod,
          estimatedDate,
          ...(shouldAutoTransitToShipping ? { status: { from: currentStatusRaw, to: '배송중', reason: 'first-shipping-registration' } } : {}),
        },
      },
      req,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ADMIN_ORDER_SHIPPING_PATCH]', error);
    return NextResponse.json({ error: '배송 정보 업데이트에 실패했습니다.' }, { status: 500 });
  }
}
