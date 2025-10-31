import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const db = (await clientPromise).db();
  const rentalId = params.id;

  const rental = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (!rental) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 상태 보호: paid 또는 out 상태만 반납 허용(필요 시 강화)
  if (!['paid', 'out'].includes(rental.status)) {
    return NextResponse.json({ message: '반납 불가 상태' }, { status: 409 });
  }

  // 대여건 상태 업데이트
  await db.collection('rental_orders').updateOne({ _id: new ObjectId(rentalId) }, { $set: { status: 'returned', returnedAt: new Date(), updatedAt: new Date() } });

  // 라켓 상태 available 로 복구
  if (rental.racketId) {
    await db.collection('used_rackets').updateOne({ _id: new ObjectId(rental.racketId) }, { $set: { status: 'available', updatedAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}
