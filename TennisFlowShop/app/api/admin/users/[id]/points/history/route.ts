import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import type { PointTransactionListItem } from '@/lib/types/points';

function parseListQuery(req: Request) {
  const { searchParams } = new URL(req.url);

  // 정수 파싱 + 범위 클램프 (NaN/소수로 skip/limit 깨지는 것 방지)
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
    // 관리자 조정 건(admin_adjust) 식별자. 일반 사용자 이벤트는 null로 응답
    adminId: d?.ref?.adminId ? String(d.ref.adminId) : null,
  };
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { db } = guard;

  const { id } = await context.params;

  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'INVALID_USER_ID' }, { status: 400 });
  }

  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const userId = new ObjectId(id);

  // 잔액 캐시(users.pointsBalance)
  const user = await db.collection('users').findOne({ _id: userId }, { projection: { pointsBalance: 1, pointsDebt: 1 } as any });
  const balance = typeof (user as any)?.pointsBalance === 'number' && Number.isFinite((user as any).pointsBalance) ? (user as any).pointsBalance : 0;
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
