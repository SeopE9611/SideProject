// import { NextResponse } from 'next/server';
// import clientPromise from '@/lib/mongodb';
// import { ObjectId } from 'mongodb';

// // body: { period: 7|15|30, shipping?: {...}, guestInfo?: {...} }
// // - 대여 가능(rental.enabled) 체크
// // - 기간별 수수료 계산 후 rental_orders insert
// export async function POST(req: Request, { params }: { params: { id: string } }) {
//   const db = (await clientPromise).db();
//   const body = await req.json().catch(() => ({} as any));
//   const period = Number(body?.period);
//   if (![7, 15, 30].includes(period)) {
//     return NextResponse.json({ message: 'Invalid rental period' }, { status: 400 });
//   }

//   const racket = await db.collection('used_rackets').findOne({ _id: new ObjectId(params.id) });
//   if (!racket || !racket.rental?.enabled) {
//     return NextResponse.json({ message: 'Not rentable' }, { status: 400 });
//   }

//   const fee = period === 7 ? racket.rental.fee.d7 : period === 15 ? racket.rental.fee.d15 : racket.rental.fee.d30;

//   const rentalDoc = {
//     // racketId: racket._id,
//     period,
//     fee,
//     deposit: racket.rental.deposit,
//     status: 'pending',
//     shipping: body.shipping ?? null,
//     guestInfo: body.guestInfo ?? null,
//     createdAt: new Date(),
//   };

//   const ins = await db.collection('rental_orders').insertOne(rentalDoc);
//   return NextResponse.json({ id: ins.insertedId.toString() }, { status: 201 });
// }

export async function POST() {
  return new Response('Gone', { status: 410 });
}
