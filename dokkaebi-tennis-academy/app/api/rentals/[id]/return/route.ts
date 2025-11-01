import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rentalId } = await params;
  const db = (await clientPromise).db();
  const rental = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (!rental) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 멱등성: 이미 반납된 건이면 그대로 성공
  if (rental.status === 'returned') {
    return NextResponse.json({ ok: true });
  }
  // 상태 보호: 결제 전(created 등)은 반납 불가, 대여중(paid|out)만 허용
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
