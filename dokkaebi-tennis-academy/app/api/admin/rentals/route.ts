import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const db = (await clientPromise).db();
  const { searchParams } = new URL(req.url);
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

  const mapped = items.map((r: any) => ({
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
  }));

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: mapped,
  });
}
