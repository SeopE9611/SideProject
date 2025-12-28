import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import type { PointTransactionListItem } from '@/lib/types/points';

function mapTx(d: any): PointTransactionListItem {
  const createdAt =
    d?.createdAt instanceof Date ? d.createdAt.toISOString() : typeof d?.createdAt === 'string' ? d.createdAt : new Date().toISOString();

  return {
    id: String(d?._id),
    amount: typeof d?.amount === 'number' ? d.amount : Number(d?.amount ?? 0),
    type: d?.type,
    status: d?.status,
    reason: d?.reason ? String(d.reason) : null,
    createdAt,
    refKey: d?.refKey ? String(d.refKey) : null,
  };
}

// GET /api/points/me
// - 마이페이지에서 "현재 보유 포인트" 및 "최근 적립/사용 내역"을 빠르게 표시하기 위한 엔드포인트
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();

  // 1) 현재 잔액(캐시)
  const user = await db.collection('users').findOne({ _id: new ObjectId(me.id) }, { projection: { pointsBalance: 1, pointsDebt: 1 } as any });
  const balance = typeof user?.pointsBalance === 'number' && Number.isFinite(user.pointsBalance) ? user.pointsBalance : 0;
  const debt = typeof (user as any)?.pointsDebt === 'number' && Number.isFinite((user as any).pointsDebt) ? (user as any).pointsDebt : 0;

  // 2) 최근 10개 내역(원장)
  const recentDocs = await db
    .collection('points_transactions')
    .find({ userId: new ObjectId(me.id) }, { projection: { userId: 0 } as any })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  return NextResponse.json(
    { ok: true, balance, debt, recent: recentDocs.map(mapTx) },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}
