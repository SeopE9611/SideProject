import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { ObjectId } from 'mongodb';

/**
 * body: { action?: 'mark' | 'clear' }  // 기본: 'mark'
 * - 'mark'  : depositRefundedAt = now   (이미 있으면 멱등 200)
 * - 'clear' : depositRefundedAt = null  (이미 null이면 멱등 200)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 관리자 권한 체크
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: '잘못된 ID' }, { status: 400 });

  const { action = 'mark' } = await req.json().catch(() => ({}));
  if (!['mark', 'clear'].includes(action)) {
    return NextResponse.json({ ok: false, message: '잘못된 action' }, { status: 400 });
  }

  const db = (await clientPromise).db();
  const c = db.collection('rental_orders');
  const doc = await c.findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });

  // returned 상태에서만 처리 허용
  if ((doc as any).status !== 'returned') {
    return NextResponse.json({ ok: false, message: 'returned 상태에서만 처리 가능', status: (doc as any).status }, { status: 409 });
  }

  // 멱등 처리
  if (action === 'mark') {
    if (doc.depositRefundedAt) return NextResponse.json({ ok: true, id, depositRefundedAt: doc.depositRefundedAt }); // 멱등
    const now = new Date().toISOString();
    await c.updateOne({ _id: new ObjectId(id) }, { $set: { depositRefundedAt: now, updatedAt: new Date() } });
    return NextResponse.json({ ok: true, id, depositRefundedAt: now });
  } else {
    if (!doc.depositRefundedAt) return NextResponse.json({ ok: true, id, depositRefundedAt: null }); // 멱등
    await c.updateOne({ _id: new ObjectId(id) }, { $unset: { depositRefundedAt: '' }, $set: { updatedAt: new Date() } });
    return NextResponse.json({ ok: true, id, depositRefundedAt: null });
  }
}
