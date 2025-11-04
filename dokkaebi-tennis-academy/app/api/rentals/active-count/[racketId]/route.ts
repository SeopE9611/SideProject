// 진행 중(active) 대여 개수 조회: paid | out
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(_req: Request, { params }: { params: Promise<{ racketId: string }> }) {
  const { racketId } = await params;
  if (!ObjectId.isValid(racketId)) {
    return NextResponse.json({ ok: false, count: 0, quantity: 1, available: 0 }, { status: 400 });
  }
  const db = (await clientPromise).db();
  const count = await db.collection('rental_orders').countDocuments({
    racketId: new ObjectId(racketId),
    status: { $in: ['paid', 'out'] }, // 진행중
  });

  // 라켓 보유 수량 조회(없으면 1로 처리)
  //   컬렉션 명이 프로젝트마다 다를 수 있어 안전하게 2군데를 순서대로 조회
  const proj = { projection: { quantity: 1 } } as const;
  const rack = (await db.collection('rackets').findOne({ _id: new ObjectId(racketId) }, proj)) ?? (await db.collection('used_rackets').findOne({ _id: new ObjectId(racketId) }, proj));
  const quantity = Number(rack?.quantity ?? 1);
  const available = Math.max(0, quantity - count);

  return NextResponse.json({ ok: true, count, quantity, available });
}
