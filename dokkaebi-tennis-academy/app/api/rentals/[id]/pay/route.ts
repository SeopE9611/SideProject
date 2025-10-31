import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = (await clientPromise).db();
  const rentalId = params.id;
  const body = await req.json();

  // 결제 상태 업데이트
  await db.collection('rental_orders').updateOne(
    { _id: new ObjectId(rentalId) },
    {
      $set: {
        status: 'paid',
        shipping: body?.shipping ?? null,
        updatedAt: new Date(),
      },
    }
  );

  // 라켓 상태를 rented 로 동기화
  const rental = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (rental?.racketId) {
    await db.collection('used_rackets').updateOne({ _id: new ObjectId(rental.racketId) }, { $set: { status: 'rented', updatedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, id: rentalId });
}
