import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// body: { shipping: { name, phone, postalCode, address, addressDetail, deliveryRequest } }
// 역할: (임시) 결제 성공 처리 → status: 'paid' 로 업데이트 + shipping 저장
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = (await clientPromise).db();
  const body = await req.json().catch(() => ({}));
  const rentalId = params.id;

  const rental = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (!rental) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 결제 성공 가정 처리
  await db.collection('rental_orders').updateOne(
    { _id: new ObjectId(rentalId) },
    {
      $set: {
        status: 'paid',
        shipping: body?.shipping ?? rental.shipping ?? null,
        updatedAt: new Date(),
      },
      $setOnInsert: {},
    }
  );

  return NextResponse.json({ ok: true, id: rentalId });
}
