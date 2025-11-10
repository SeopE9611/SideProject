import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 관리자 권한
  const guard = await requireAdmin(req);
  if (!('ok' in guard) || !guard.ok) return guard.res;
  const db = guard.db;

  const { searchParams } = new URL(req.url);
  const pay = searchParams.get('pay'); // 'paid' | 'unpaid' | null
  const ship = searchParams.get('ship'); // 'outbound-set' | 'return-set' | 'none' | null

  const query: any = {};
  // 결제 필터: paid = status in ['paid','out','returned'] or payment.paidAt exists
  if (pay === 'paid') {
    query.$or = [{ status: { $in: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: true } }, { paidAt: { $exists: true } }];
  } else if (pay === 'unpaid') {
    query.$and = [{ status: { $nin: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: false } }, { paidAt: { $exists: false } }];
  }

  // 배송 필터: outbound-set / return-set / none
  if (ship === 'outbound-set') {
    query['shipping.outbound.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'return-set') {
    query['shipping.return.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'none') {
    query.$and = (query.$and ?? []).concat([{ 'shipping.outbound.trackingNumber': { $in: [null, '', undefined] } }, { 'shipping.return.trackingNumber': { $in: [null, '', undefined] } }]);
  }

  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
  const status = searchParams.get('status') || ''; // '', created, paid, out, returned, canceled
  const brand = searchParams.get('brand') || '';
  const from = searchParams.get('from') || ''; // 'YYYY-MM-DD'
  const to = searchParams.get('to') || ''; // 'YYYY-MM-DD'
  const sortParam = searchParams.get('sort') || '-createdAt'; // 예: -createdAt / +createdAt

  const q: any = {};
  if (status) q.status = status;
  if (brand) q.brand = { $regex: brand, $options: 'i' };
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(`${from}T00:00:00.000Z`).toISOString();
    if (to) q.createdAt.$lte = new Date(`${to}T23:59:59.999Z`).toISOString();
  }

  // 정렬 파싱(-: desc / +: asc)
  const sortKey = sortParam.startsWith('-') || sortParam.startsWith('+') ? sortParam.slice(1) : sortParam;
  const sortDir: 1 | -1 = sortParam.startsWith('-') ? -1 : 1;
  const sort = { [sortKey]: sortDir } as Record<string, 1 | -1>;

  const cursor = db
    .collection('rental_orders')
    .find(q)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const items = await cursor.toArray();
  const total = await db.collection('rental_orders').countDocuments(q);

  const mapped = items.map((r: any) => {
    const out = r?.shipping?.outbound;
    const track = out?.trackingNumber || '';
    return {
      id: r._id ? r._id.toString() : undefined,
      racketId: r.racketId?.toString(),
      brand: r.brand || '',
      model: r.model || '',
      status: r.status,
      days: r.days ?? r.period ?? 0,
      amount: r.amount ?? { fee: r.fee ?? 0, deposit: r.deposit ?? 0, total: (r.fee ?? 0) + (r.deposit ?? 0) },
      createdAt: r.createdAt,
      outAt: r.outAt ?? null, // (표시용) 출고 시각
      dueAt: r.dueAt ?? null, // 반납 예정일
      returnedAt: r.returnedAt ?? null, // 반납 완료 시각
      depositRefundedAt: r.depositRefundedAt ?? null, // 환불 완료 시각(토글용)
      outboundShippingBrief: track ? { courier: out?.courier || '', trackingLast4: String(track).slice(-4) } : null,
    };
  });

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: mapped,
  });
}
