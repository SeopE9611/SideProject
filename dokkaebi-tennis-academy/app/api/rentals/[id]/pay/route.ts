import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rentalId } = await params;
  const db = (await clientPromise).db();
  const body = await req.json();

  // 현재 주문 조회
  const order = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (!order) return NextResponse.json({ message: 'NOT_FOUND' }, { status: 404 });
  // 이미 결제된 상태면 멱등 처리
  if (['paid', 'out', 'returned'].includes(order.status)) {
    return NextResponse.json({ ok: true, id: rentalId });
  }
  // 결제 성공 처리
  await db.collection('rental_orders').updateOne({ _id: new ObjectId(rentalId) }, { $set: { status: 'paid', shipping: body?.shipping ?? null, updatedAt: new Date() } });

  // 라켓 상태 동기화
  const updated = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (updated?.racketId) {
    await db.collection('used_rackets').updateOne({ _id: new ObjectId(updated.racketId) }, { $set: { status: 'rented', updatedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, id: rentalId });
}
