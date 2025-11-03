import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
  // 결제 전에는 out 불가
  if (order.status !== 'paid') {
    return NextResponse.json({ message: '대여 시작 불가 상태' }, { status: 409 });
  }

  await db.collection('rental_orders').updateOne({ _id }, { $set: { status: 'out', outAt: new Date(), updatedAt: new Date() } });

  // 라켓은 이미 paid에서 rented로 바뀌어 있음. 혹시 싱크 깨진 경우 보정
  if (order.racketId) {
    await db.collection('used_rackets').updateOne({ _id: order.racketId }, { $set: { status: 'rented', updatedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, id });
}
