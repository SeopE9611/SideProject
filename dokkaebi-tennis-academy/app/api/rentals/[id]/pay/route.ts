import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { canTransitIdempotent } from '@/app/features/rentals/utils/status';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rentalId } = await params;
  const db = (await clientPromise).db();
  const body = await req.json();

  // 현재 주문 조회
  const order = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (!order) return NextResponse.json({ message: 'NOT_FOUND' }, { status: 404 });

  // 이미 결제된 상태면 멱등 처리 (동일 요청 반복 허용)
  if ((order.status ?? 'created') === 'paid') {
    return NextResponse.json({ ok: true, id: rentalId });
  }

  // 전이 가능성 선검사 (가독성용, 진짜 보호는 아래 조건부 updateOne이 담당)
  if (!canTransitIdempotent(order.status ?? 'created', 'paid') || (order.status ?? 'created') !== 'created') {
    return NextResponse.json({ ok: false, code: 'INVALID_STATE', message: '결제 불가 상태', status: order.status }, { status: 409 });
  }
  // 원자적 전이: 현재 status가 'created'인 경우에만 'paid'로 전환
  const u = await db.collection('rental_orders').updateOne(
    { _id: new ObjectId(rentalId), status: 'created' }, // 상태 조건 포함
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
    // 경합 등으로 상태가 바뀐 경우
    return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 409 });
  }
  // 라켓 상태 동기화
  const updated = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (updated?.racketId) {
    await db.collection('used_rackets').updateOne({ _id: new ObjectId(String(updated.racketId)) }, { $set: { status: 'rented', updatedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, id: rentalId });
}
