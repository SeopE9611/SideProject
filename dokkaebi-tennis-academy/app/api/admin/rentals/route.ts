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

  const q: any = {};
  // --- 결제 필터 ---
  if (pay === 'paid') {
    q.$or = [{ status: { $in: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: true } }, { paidAt: { $exists: true } }];
  } else if (pay === 'unpaid') {
    q.$and = [{ status: { $nin: ['paid', 'out', 'returned'] } }, { 'payment.paidAt': { $exists: false } }, { paidAt: { $exists: false } }];
  }

  // --- 배송(운송장) 필터 ---
  if (ship === 'outbound-set') {
    q['shipping.outbound.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'return-set') {
    q['shipping.return.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'both-set') {
    q['shipping.outbound.trackingNumber'] = { $exists: true, $ne: '' };
    q['shipping.return.trackingNumber'] = { $exists: true, $ne: '' };
  } else if (ship === 'none') {
    q.$and = (q.$and ?? []).concat([
      { $or: [{ 'shipping.outbound.trackingNumber': { $in: [null, '', undefined] } }, { 'shipping.outbound': { $exists: false } }] },
      { $or: [{ 'shipping.return.trackingNumber': { $in: [null, '', undefined] } }, { 'shipping.return': { $exists: false } }] },
    ]);
  }

  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
  const status = searchParams.get('status') || ''; // '', created, paid, out, returned, canceled
  const brand = searchParams.get('brand') || '';
  const from = searchParams.get('from') || ''; // 'YYYY-MM-DD'
  const to = searchParams.get('to') || ''; // 'YYYY-MM-DD'
  const sortParam = searchParams.get('sort') || '-createdAt'; // 예: -createdAt / +createdAt

  if (status) q.status = status;
  if (brand) q.brand = { $regex: brand, $options: 'i' };

  // 날짜 필터: 문자열 비교 대신 Date 비교 (KST 기준 포함 범위)
  if (from || to) {
    const createdAtCond: any = {};
    if (from) {
      // from일 00:00:00.000 KST → UTC Date
      createdAtCond.$gte = new Date(`${from}T00:00:00+09:00`);
    }
    if (to) {
      // to일 23:59:59.999 KST → UTC Date
      createdAtCond.$lte = new Date(`${to}T23:59:59.999+09:00`);
    }
    q.createdAt = createdAtCond;
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

  const docs = await db
    .collection('rental_orders')
    .find(q)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  // 사용자 배치 조회
  const userIds = Array.from(
    new Set(
      docs.map((d) => d.userId).filter(Boolean) // null/undefined 제거
    )
  );

  let userMap = new Map<string, { name?: string; email?: string }>();
  if (userIds.length > 0) {
    const users = await db
      .collection('users')
      .find({ _id: { $in: userIds } }) // userId가 ObjectId라면 그대로 OK
      .project({ name: 1, email: 1 })
      .toArray();

    users.forEach((u) => userMap.set(String(u._id), { name: u.name, email: u.email }));
  }

  const mapped = docs.map((r: any) => {
    const out = r?.shipping?.outbound ?? null;
    const ret = r?.shipping?.return ?? null;
    const cust = (r.userId && userMap.get(String(r.userId))) || (r.guest ? { name: r.guest.name, email: r.guest.email } : { name: '', email: '' });

    return {
      id: r._id?.toString(),
      racketId: r.racketId?.toString(),
      brand: r.brand || '',
      model: r.model || '',
      status: r.status,
      days: r.days ?? r.period ?? 0,
      amount: r.amount ?? { fee: r.fee ?? 0, deposit: r.deposit ?? 0, total: (r.fee ?? 0) + (r.deposit ?? 0) },
      createdAt: r.createdAt,
      outAt: r.outAt ?? null,
      dueAt: r.dueAt ?? null,
      returnedAt: r.returnedAt ?? null,
      depositRefundedAt: r.depositRefundedAt ?? null,

      shipping: {
        outbound: out
          ? {
              courier: out.courier ?? '',
              trackingNumber: out.trackingNumber ?? '',
              shippedAt: out.shippedAt ?? null,
            }
          : null,
        return: ret
          ? {
              courier: ret.courier ?? '',
              trackingNumber: ret.trackingNumber ?? '',
              shippedAt: ret.shippedAt ?? null,
            }
          : null,
      },

      // 요약이 필요하면 brief 유지 가능
      // outboundShippingBrief: out?.trackingNumber
      //   ? { courier: out.courier ?? '', trackingLast4: String(out.trackingNumber).slice(-4) }
      //   : null,

      customer: {
        name: cust?.name || '',
        email: cust?.email || '',
      },
    };
  });

  return NextResponse.json({ page, pageSize, total, items: mapped });
}
