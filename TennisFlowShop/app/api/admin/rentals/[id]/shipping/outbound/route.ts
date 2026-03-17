import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { ObjectId } from 'mongodb';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { normalizeRentalPaymentMeta } from '@/lib/admin-ops-normalize';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 관리자 인증
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // 파라미터/바디 검증
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
  const { courier = '', trackingNumber = '', shippedAt } = await req.json().catch(() => ({}));
  if (!courier || !trackingNumber) return NextResponse.json({ ok: false, message: 'MISSING_FIELDS' }, { status: 400 });

  // 저장
  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const rental: any = await db.collection('rental_orders').findOne({ _id });
  if (!rental) return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });

  const prevOutbound = rental?.shipping?.outbound ?? {};
  const prevCourier = String(prevOutbound?.courier ?? '').trim();
  const prevTracking = String(prevOutbound?.trackingNumber ?? '').trim();
  const prevShippedAt = prevOutbound?.shippedAt ? new Date(prevOutbound.shippedAt) : null;
  const hadOutbound = Boolean(prevCourier || prevTracking || (prevShippedAt && Number.isFinite(prevShippedAt.getTime())));

  const currentStatus = String(rental?.status ?? '').trim();
  const isVisitPickup = String(rental?.servicePickupMethod ?? '').trim() === 'SHOP_VISIT';
  const isPaymentCompleted = normalizeRentalPaymentMeta(rental).label === '결제완료';
  const shouldAutoTransitToOut = !isVisitPickup && !hadOutbound && isPaymentCompleted && !['canceled', 'cancelled', 'returned', 'out'].includes(currentStatus);

  const outAt = new Date().toISOString();
  const rawDays = Number(rental?.days ?? 7);
  const days = rawDays === 7 || rawDays === 15 || rawDays === 30 ? rawDays : 7;
  const due = new Date(outAt);
  due.setDate(due.getDate() + days);
  const dueAt = due.toISOString();

  const nextShippedAt = shippedAt ? new Date(shippedAt) : new Date();
  const updateDoc: any = {
    $set: {
      'shipping.outbound': {
        courier,
        trackingNumber,
        shippedAt: nextShippedAt,
      },
      updatedAt: new Date(),
    },
  };

  if (shouldAutoTransitToOut) {
    updateDoc.$set.status = 'out';
    updateDoc.$set.outAt = outAt;
    updateDoc.$set.dueAt = dueAt;
  }

  await db.collection('rental_orders').updateOne({ _id }, updateDoc);

  await appendAdminAudit(
    db,
    {
      type: 'admin.rentals.shipping.outbound.post',
      actorId: guard.admin._id,
      targetId: _id,
      message: shouldAutoTransitToOut ? '대여 출고 배송정보 등록 및 자동 상태 전환' : hadOutbound ? '대여 출고 배송정보 수정' : '대여 출고 배송정보 등록',
      diff: {
        outbound: { courier: String(courier).trim(), trackingNumber: String(trackingNumber).trim(), shippedAt: nextShippedAt },
        ...(shouldAutoTransitToOut ? { status: { from: currentStatus, to: 'out', reason: 'first-outbound-shipping-registration' }, outAt, dueAt } : {}),
      },
    },
    req,
  );

  if (shouldAutoTransitToOut) {
    await writeRentalHistory(db, _id, {
      action: 'out',
      from: currentStatus || 'paid',
      to: 'out',
      actor: { role: 'admin', id: String(guard.admin._id) },
      snapshot: { reason: 'first-outbound-shipping-registration' },
    });
  }

  return NextResponse.json({ ok: true });
}
