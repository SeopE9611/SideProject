import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import type { PointTransactionListItem } from '@/lib/types/points';

function parseListQuery(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Number()는 '1.5' 같은 소수도 통과하고, NaN이 섞이면 skip/limit에 비정수가 들어갈 수 있어
  // 정수 파싱 + 범위 클램프로 고정
  const pageRaw = parseInt(searchParams.get('page') ?? '1', 10);
  const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10);

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

export async function GET(req: NextRequest) {
  // getCurrentUser 내부에서 토큰 검증(verifyAccessToken 등)이 throw 되어도
  // 라우터가 500으로 터지지 않도록 방어(= 401로 정리)
  let me: any = null;
  try {
    me = await getCurrentUser();
  } catch {
    me = null;
  }
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const db = await getDb();
  // me.id가 ObjectId 문자열이 아니면 new ObjectId에서 500이 나므로 사전 차단
  const uidStr = String(me?.id ?? '');
  if (!uidStr || !ObjectId.isValid(uidStr)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = new ObjectId(uidStr);

  // 현재 잔액(캐시)
  const user = await db.collection('users').findOne({ _id: userId }, { projection: { pointsBalance: 1, pointsDebt: 1 } as any });
  const balance = typeof user?.pointsBalance === 'number' && Number.isFinite(user.pointsBalance) ? user.pointsBalance : 0;
  const debt = typeof (user as any)?.pointsDebt === 'number' && Number.isFinite((user as any).pointsDebt) ? (user as any).pointsDebt : 0;

  const col = db.collection('points_transactions');
  const filter = { userId };

  const total = await col.countDocuments(filter as any);
  const docs = await col
    .find(filter as any, { projection: { userId: 0 } as any })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return NextResponse.json({ ok: true, balance, debt, items: docs.map(mapTx), total, page, limit }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
}
