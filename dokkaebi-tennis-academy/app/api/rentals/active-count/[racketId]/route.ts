// 진행 중(active) 대여 개수 조회: paid | out
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(_: Request, { params }: { params: { racketId: string } }) {
  const { racketId } = params;
  if (!ObjectId.isValid(racketId)) return NextResponse.json({ ok: false, count: 0 }, { status: 400 });

  const db = (await clientPromise).db();
  const count = await db.collection('rental_orders').countDocuments({
    racketId: new ObjectId(racketId),
    status: { $in: ['paid', 'out'] }, // 진행 중
  });
  return NextResponse.json({ ok: true, count });
}
