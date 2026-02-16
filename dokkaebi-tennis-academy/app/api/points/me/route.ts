import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import type { PointTransactionListItem } from '@/lib/types/points';

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

// 마이페이지에서 "현재 보유 포인트" 및 "최근 적립/사용 내역"을 빠르게 표시하기 위한 엔드포인트
export async function GET() {
  // getCurrentUser 내부에서 토큰 검증(verifyAccessToken 등)이 throw 되어도
  // 라우터가 500으로 터지지 않도록 방어(= 401로 정리)
  let me: any = null;
  try {
    me = await getCurrentUser();
  } catch {
    me = null;
  }
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // 토큰 payload가 오염되어 id가 ObjectId가 아니면 new ObjectId에서 500이 나므로 사전 차단
  const uidStr = String(me?.id ?? '');
  if (!uidStr || !ObjectId.isValid(uidStr)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = new ObjectId(uidStr);
  const db = await getDb();

  // 1) 현재 잔액(캐시)
  const user = await db.collection('users').findOne({ _id: userId }, { projection: { pointsBalance: 1, pointsDebt: 1 } as any });
  const balanceRaw = typeof user?.pointsBalance === 'number' && Number.isFinite(user.pointsBalance) ? user.pointsBalance : 0;
  const debtRaw = typeof (user as any)?.pointsDebt === 'number' && Number.isFinite((user as any).pointsDebt) ? (user as any).pointsDebt : 0;

  // 안전 정수화 + 음수 방지(정책상 balance/debt는 0 이상 정수로 관리)
  const balance = Math.max(0, Math.trunc(balanceRaw));
  const debt = Math.max(0, Math.trunc(debtRaw));

  // 2) 최근 10개 내역(원장)
  const recentDocs = await db
    .collection('points_transactions')
    .find({ userId }, { projection: { userId: 0 } as any })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  // 실제 “사용 가능 포인트”
  const available = Math.max(0, balance - debt);

  return NextResponse.json({ ok: true, balance, debt, available, recent: recentDocs.map(mapTx) }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
}
