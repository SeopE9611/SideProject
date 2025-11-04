import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await clientPromise).db();
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  }
  const doc = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 응답 정리: 프런트에서 쓰기 좋게 id/amount 평탄화
  return NextResponse.json({
    id: doc._id.toString(),
    racketId: doc.racketId?.toString?.(),
    brand: doc.brand,
    model: doc.model,
    days: doc.days,
    status: typeof doc.status === 'string' ? doc.status.toLowerCase() : doc.status,
    amount: doc.amount, // { deposit, fee, total }
    createdAt: doc.createdAt,
    outAt: doc.outAt ?? null, // 출고 시각
    dueAt: doc.dueAt ?? null, // 반납 예정
    returnedAt: doc.returnedAt ?? null, // 반납 완료
    depositRefundedAt: doc.depositRefundedAt ?? null, // 보증금 환불 시각
  });
}
