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

  const { id: rentalId } = await params;
  if (!ObjectId.isValid(rentalId)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });

  const _id = new ObjectId(rentalId);
  const rental = await guard.db.collection('rental_orders').findOne({ _id });
  if (!rental) return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  if ((rental.status ?? 'pending') === 'returned') return NextResponse.json({ ok: true });
  if (!canTransitIdempotent(rental.status ?? 'pending', 'returned') || rental.status !== 'out') {
    return NextResponse.json({ ok: false, code: 'INVALID_STATE', message: '반납 불가 상태' }, { status: 409 });
  }

  const updated = await guard.db.collection('rental_orders').updateOne(
    { _id, status: 'out' },
    { $set: { status: 'returned', returnedAt: new Date(), updatedAt: new Date() } },
  );
  if (updated.matchedCount === 0) return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 409 });

  await appendAdminAudit(
    guard.db,
    {
      type: 'admin.rentals.status.returned',
      actorId: guard.admin._id,
      targetId: _id,
      message: '대여 상태를 out → returned 로 전환',
      diff: { from: 'out', to: 'returned' },
    },
    req,
  );

  await writeRentalHistory(guard.db, rentalId, {
    action: 'returned',
    from: 'out',
    to: 'returned',
    actor: { role: 'admin', id: String(guard.admin._id) },
  });

  if (rental.racketId) {
    const racketIdStr = String(rental.racketId);
    if (ObjectId.isValid(racketIdStr)) {
      const rid = new ObjectId(racketIdStr);
      const rack = await guard.db.collection('used_rackets').findOne({ _id: rid }, { projection: { quantity: 1 } });
      const qty = Number(rack?.quantity ?? 1);
      if (qty <= 1) await guard.db.collection('used_rackets').updateOne({ _id: rid }, { $set: { status: 'available', updatedAt: new Date() } });
    }
  }

  return NextResponse.json({ ok: true });
}
