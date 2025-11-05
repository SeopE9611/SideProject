import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { canTransitIdempotent } from '@/app/features/rentals/utils/status';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rentalId } = await params;
    const db = (await clientPromise).db();
    const body = await req.json().catch(() => ({} as any)); // 바디 없으면 빈 객체

    // 주문 조회
    const _id = new ObjectId(rentalId);
    const order = await db.collection('rental_orders').findOne({ _id });
    if (!order) {
      return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });
    }

    // 멱등 처리: 이미 paid면 OK
    if ((order.status ?? 'created') === 'paid') {
      return NextResponse.json({ ok: true, id: rentalId });
    }

    // 금액 무결성 가드: total이 0원이면 결제 차단
    const amt = order.amount ?? { fee: 0, deposit: 0, total: 0 };
    const total = Number(amt.total ?? 0);
    if (!total || total <= 0) {
      return NextResponse.json({ ok: false, code: 'INVALID_AMOUNT', message: '0원 결제는 허용되지 않습니다.' }, { status: 409 });
    }

    // 상태 전이 가능성 선검사(가독) - 진짜 보호는 조건부 updateOne
    if (!canTransitIdempotent(order.status ?? 'created', 'paid') || (order.status ?? 'created') !== 'created') {
      return NextResponse.json({ ok: false, code: 'INVALID_STATE', message: '결제 불가 상태', status: order.status }, { status: 409 });
    }

    // 원자 전이: created → paid (경합 시 1건만 성공)
    const u = await db.collection('rental_orders').updateOne(
      { _id, status: 'created' },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          payment: body?.payment ?? null,
          shipping: body?.shipping ?? null,
          updatedAt: new Date(),
        },
      }
    );
    if (u.matchedCount === 0) {
      return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 409 });
    }

    // 라켓 상태 동기화: 단일 수량일 때만 status 보정(복수 수량이면 status 미변경)
    const updated = await db.collection('rental_orders').findOne({ _id });
    if (updated?.racketId) {
      const rack = await db.collection('used_rackets').findOne({ _id: new ObjectId(String(updated.racketId)) }, { projection: { quantity: 1 } });
      const qty = Number(rack?.quantity ?? 1);
      if (qty <= 1) {
        await db.collection('used_rackets').updateOne({ _id: new ObjectId(String(updated.racketId)) }, { $set: { status: 'rented', updatedAt: new Date() } });
      }
    }

    return NextResponse.json({ ok: true, id: rentalId });
  } catch (err) {
    console.error('POST /api/rentals/[id]/pay error:', err);
    return NextResponse.json({ ok: false, message: 'SERVER_ERROR' }, { status: 500 });
  }
}
