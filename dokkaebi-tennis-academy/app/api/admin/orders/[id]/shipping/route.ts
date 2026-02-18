import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { normalizeOrderShippingMethod } from '@/lib/order-shipping';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';

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

    if (isCourier) {
      setOps['shippingInfo.invoice'] = { courier: String(courier).trim(), trackingNumber: String(trackingNumber).trim() };
      await db.collection('orders').updateOne({ _id: orderId }, { $set: setOps });
    } else {
      await db.collection('orders').updateOne({ _id: orderId }, { $set: setOps, $unset: { 'shippingInfo.invoice': '' } });
    }

    const formattedDate = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(est);
    await db.collection('orders').updateOne({ _id: orderId }, {
      $push: {
        history: {
          status: '배송정보변경',
          date: new Date().toISOString(),
          description: `배송 방법을 "${shippingMethodMap[normalizedMethod] ?? '정보 없음'}"으로 변경하고, 예상 수령일을 "${formattedDate}"로 설정했습니다.`,
        },
      },
    } as any);

    await appendAdminAudit(
      guard.db,
      {
        type: 'admin.orders.shipping.patch',
        actorId: guard.admin._id,
        targetId: orderId,
        message: '주문 배송정보 수정',
        diff: { shippingMethod: normalizedMethod, estimatedDate },
      },
      req,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ADMIN_ORDER_SHIPPING_PATCH]', error);
    return NextResponse.json({ error: '배송 정보 업데이트에 실패했습니다.' }, { status: 500 });
  }
}
