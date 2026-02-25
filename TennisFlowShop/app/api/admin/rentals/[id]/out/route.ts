import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { canTransitIdempotent } from '@/app/features/rentals/utils/status';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });

  const _id = new ObjectId(id);
  const order: any = await guard.db.collection('rental_orders').findOne({ _id });
  if (!order) return NextResponse.json({ message: 'NOT_FOUND' }, { status: 404 });
  const currentStatus = order.status ?? 'paid';

  if (['out', 'returned'].includes(currentStatus)) return NextResponse.json({ ok: true, id });
  if (!canTransitIdempotent(currentStatus, 'out') || currentStatus !== 'paid') {
    return NextResponse.json({ ok: false, code: 'INVALID_STATE', message: '대여 시작 불가 상태' }, { status: 409 });
  }

  const outAt = new Date().toISOString();
  const rawDays = Number(order.days ?? 7);
  const days = rawDays === 7 || rawDays === 15 || rawDays === 30 ? rawDays : 7;
  const due = new Date(outAt);
  due.setDate(due.getDate() + days);
  const dueAt = due.toISOString();

  const updated = await guard.db.collection('rental_orders').updateOne(
    { _id, status: 'paid' },
    { $set: { status: 'out', outAt, dueAt, updatedAt: new Date() } },
  );
  if (updated.matchedCount === 0) return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 409 });

  await appendAdminAudit(
    guard.db,
    {
      type: 'admin.rentals.status.out',
      actorId: guard.admin._id,
      targetId: _id,
      message: '대여 상태를 paid → out 으로 전환',
      diff: { from: 'paid', to: 'out', outAt, dueAt },
    },
    req,
  );

  await writeRentalHistory(guard.db, id, {
    action: 'out',
    from: 'paid',
    to: 'out',
    actor: { role: 'admin', id: String(guard.admin._id) },
  });

  if (order.racketId) {
    const racketIdStr = String(order.racketId);
    if (ObjectId.isValid(racketIdStr)) {
      const rid = new ObjectId(racketIdStr);
      const rack = await guard.db.collection('used_rackets').findOne({ _id: rid }, { projection: { quantity: 1, status: 1 } });
      const qty = Number(rack?.quantity ?? 1);
      if (!Number.isFinite(qty) || qty <= 1) {
        await guard.db.collection('used_rackets').updateOne({ _id: rid, status: { $in: ['available', 'rented'] } }, { $set: { status: 'rented', updatedAt: new Date() } });
      }
    }
  }

  return NextResponse.json({ ok: true, id });
}
