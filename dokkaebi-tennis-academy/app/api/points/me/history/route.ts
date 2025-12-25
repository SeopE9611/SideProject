import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import type { PointTransactionListItem } from '@/lib/types/points';

function parseListQuery(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const pageRaw = Number(searchParams.get('page') ?? '1');
  const limitRaw = Number(searchParams.get('limit') ?? '20');

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 50 ? limitRaw : 20;

  return { page, limit };
}

function mapTx(d: any): PointTransactionListItem {
  const createdAt = d?.createdAt instanceof Date ? d.createdAt.toISOString() : typeof d?.createdAt === 'string' ? d.createdAt : new Date().toISOString();

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

// GET /api/points/me/history?page=1&limit=20
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const db = await getDb();
  const userId = new ObjectId(me.id);

  // 현재 잔액(캐시)
  const user = await db.collection('users').findOne({ _id: userId }, { projection: { pointsBalance: 1 } as any });
  const balance = typeof user?.pointsBalance === 'number' && Number.isFinite(user.pointsBalance) ? user.pointsBalance : 0;

  const col = db.collection('points_transactions');
  const filter = { userId };

  const total = await col.countDocuments(filter as any);
  const docs = await col
    .find(filter as any, { projection: { userId: 0 } as any })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return NextResponse.json({ ok: true, balance, items: docs.map(mapTx), total, page, limit }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
}
