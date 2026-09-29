import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { canTransitIdempotent } from '@/app/features/rentals/utils/status';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { getLinkedRentalStringingStatus } from '@/lib/admin/rental-stringing-flow.server';
import { hasRentalStringingService, isRentalStringingComplete } from '@/lib/rental-stringing-flow';

export const dynamic = 'force-dynamic';

class RentalOutError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly message: string = code,
  ) {
    super(message);
  }
}

const cancelRequestAllowsOut = {
  $or: [
    { cancelRequest: { $exists: false } },
    { cancelRequest: null },
    { 'cancelRequest.status': 'rejected' },
  ],
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();
  const _id = new ObjectId(id);
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const rentals = db.collection('rental_orders');
      const order: any = await rentals.findOne({ _id }, { session });
      if (!order) throw new RentalOutError('NOT_FOUND', 404);

      const currentStatus = order.status ?? 'paid';
      if (['out', 'returned'].includes(currentStatus)) {
        return { transitioned: false as const, outAt: null, dueAt: null, isVisitPickup: false };
      }
      if (!canTransitIdempotent(currentStatus, 'out') || currentStatus !== 'paid') {
        throw new RentalOutError('INVALID_STATE', 409, '대여 시작 불가 상태');
      }

      const cancelStatus = order.cancelRequest?.status;
      if (order.cancelRequest != null && cancelStatus !== 'rejected') {
        throw new RentalOutError('RENTAL_CANCEL_REQUEST_ACTIVE', 409);
      }

      const isVisitPickup = String(order?.servicePickupMethod ?? '').trim() === 'SHOP_VISIT';
      const hasOutboundTracking = Boolean(
        String(order?.shipping?.outbound?.trackingNumber ?? '').trim(),
      );
      if (!isVisitPickup && !hasOutboundTracking) {
        throw new RentalOutError(
          'OUTBOUND_TRACKING_REQUIRED',
          409,
          '택배 배송 건은 출고 운송장 등록 후 수령 확인 / 대여 시작을 진행할 수 있습니다.',
        );
      }

      const stringingStatus = await getLinkedRentalStringingStatus(db, order, id);
      if (hasRentalStringingService(order) || stringingStatus !== null) {
        if (!isRentalStringingComplete(stringingStatus)) {
          throw new RentalOutError(
            'STRINGING_NOT_COMPLETED',
            409,
            '교체서비스가 완료된 뒤 출고 또는 대여 시작을 진행할 수 있습니다.',
          );
        }
      }

      const transitionAt = new Date();
      const outAt = transitionAt.toISOString();
      const rawDays = Number(order.days ?? 7);
      const days = rawDays === 7 || rawDays === 15 || rawDays === 30 ? rawDays : 7;
      const due = new Date(transitionAt);
      due.setDate(due.getDate() + days);
      const dueAt = due.toISOString();

      const updated = await rentals.updateOne(
        { _id, status: 'paid', ...cancelRequestAllowsOut },
        { $set: { status: 'out', outAt, dueAt, updatedAt: transitionAt } },
        { session },
      );
      if (updated.matchedCount === 0) {
        throw new RentalOutError('RENTAL_OUT_STATE_CONFLICT', 409);
      }

      await db.collection('rental_history').insertOne(
        {
          rentalId: _id,
          action: 'out',
          from: 'paid',
          to: 'out',
          actor: { role: 'admin', id: String(guard.admin._id) },
          at: transitionAt,
        },
        { session },
      );

      const racketIdStr = String(order.racketId ?? '');
      if (ObjectId.isValid(racketIdStr)) {
        const rid = new ObjectId(racketIdStr);
        const rack: any = await db
          .collection('used_rackets')
          .findOne({ _id: rid }, { projection: { quantity: 1 }, session });
        const qty = Number(rack?.quantity ?? 1);
        if (rack && (!Number.isFinite(qty) || qty <= 1)) {
          const racketUpdated = await db
            .collection('used_rackets')
            .updateOne(
              { _id: rid },
              { $set: { status: 'rented', updatedAt: transitionAt } },
              { session },
            );
          if (racketUpdated.matchedCount === 0) {
            throw new RentalOutError('RENTAL_RACKET_NOT_FOUND', 409);
          }
        }
      }

      return { transitioned: true as const, outAt, dueAt, isVisitPickup };
    });

    if (!result) throw new RentalOutError('RENTAL_OUT_FAILED', 409);
    if (!result.transitioned) return NextResponse.json({ ok: true, id });

    await appendAdminAudit(
      db,
      {
        type: 'admin.rentals.status.out',
        actorId: guard.admin._id,
        targetId: _id,
        message: result.isVisitPickup ? '방문 수령 처리' : '수령 확인 / 대여 시작',
        diff: { from: 'paid', to: 'out', outAt: result.outAt, dueAt: result.dueAt },
      },
      req,
    );

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof RentalOutError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
