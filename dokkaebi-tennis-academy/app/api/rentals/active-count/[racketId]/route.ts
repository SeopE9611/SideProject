import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// 진행 중(active) 대여 개수 조회: paid | out
export async function GET(_req: Request, { params }: { params: Promise<{ racketId: string }> }) {
  const { racketId } = await params;
  if (!ObjectId.isValid(racketId)) {
    return NextResponse.json({ ok: false, count: 0, quantity: 1, available: 0 }, { status: 400 });
  }

  const db = (await clientPromise).db();

  // 진행 중 개수
  const count = await db.collection('rental_orders').countDocuments({
    racketId: new ObjectId(racketId),
    status: { $in: ['paid', 'out'] },
  });

  // 라켓 수량 (used_rackets 우선 → rackets 폴백)
  const proj = { projection: { quantity: 1 } } as const;
  const used = await db.collection('used_rackets').findOne({ _id: new ObjectId(racketId) }, proj);
  const rack = used ?? (await db.collection('rackets').findOne({ _id: new ObjectId(racketId) }, proj));
  const quantity = Number(rack?.quantity ?? 1);

  // 잔여
  const available = Math.max(0, quantity - count);
  return NextResponse.json({ ok: true, count, quantity, available });
}
