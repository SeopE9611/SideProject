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

  // - 단품 라켓(<=1)은 status가 available일 때만 1개로 취급 (sold/inactive면 0개)
  const projUsed = { projection: { quantity: 1, status: 1 } } as const;
  const projRackets = { projection: { quantity: 1 } } as const;
  const used = await db.collection('used_rackets').findOne({ _id: new ObjectId(racketId) }, projUsed);
  const rack = used ?? (await db.collection('rackets').findOne({ _id: new ObjectId(racketId) }, projRackets));
  const rawQty = Number(rack?.quantity ?? 1);
  const baseQty = used ? (!Number.isFinite(rawQty) || rawQty <= 1 ? (used.status === 'available' ? 1 : 0) : rawQty) : rawQty;

  // 잔여
  const available = Math.max(0, baseQty - count);
  return NextResponse.json({ ok: true, count, quantity: baseQty, available });
}
