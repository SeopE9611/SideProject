import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { canTransitIdempotent } from '@/app/features/rentals/utils/status';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });

  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const order = await db.collection('rental_orders').findOne({ _id });
  if (!order) return NextResponse.json({ message: 'NOT_FOUND' }, { status: 404 });

  // already out/returned → 멱등 성공
  if (['out', 'returned'].includes(order.status)) {
    return NextResponse.json({ ok: true, id });
  }
  // 결제전 paid → out 만 허용
  if (!canTransitIdempotent(order.status ?? 'created', 'out') || order.status !== 'paid') {
    return NextResponse.json({ message: '대여 시작 불가 상태' }, { status: 409 });
  }

  // 이미 'out'이면 멱등 처리
  if ((order.status ?? 'created') === 'out') {
    return NextResponse.json({ ok: true, id });
  }

  // 출고 시각 & 예정일 계산
  const outAt = new Date().toISOString();
  const days = (order as any).days ?? 7;
  const due = new Date(outAt);
  due.setDate(due.getDate() + days);
  const dueAt = due.toISOString();

  // 전이 가능성 선검사(가독), 실보호는 updateOne
  if (!canTransitIdempotent(order.status ?? 'created', 'out') || (order.status ?? 'created') !== 'paid') {
    return NextResponse.json({ ok: false, code: 'INVALID_STATE', message: '출고 불가 상태', status: order.status }, { status: 409 });
  }

  // 원자적 전이: 현재 status가 'paid'인 경우에만 'out'
  const u = await db.collection('rental_orders').updateOne(
    { _id, status: 'paid' }, // 상태 조건 포함
    { $set: { status: 'out', outAt, dueAt, updatedAt: new Date() } }
  );
  if (u.matchedCount === 0) {
    return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 409 });
  }
  // 라켓은 이미 paid에서 rented로 바뀌어 있음. 혹시 싱크 깨진 경우 보정
  if (order.racketId) {
    await db.collection('used_rackets').updateOne({ _id: new ObjectId(String(order.racketId)) }, { $set: { status: 'rented', updatedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, id });
}
