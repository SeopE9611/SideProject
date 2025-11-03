import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const db = (await clientPromise).db();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
  const status = searchParams.get('status') || ''; // '', created, paid, out, returned

  const q: any = {};
  if (status) q.status = status;

  const cursor = db
    .collection('rental_orders')
    .find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const items = await cursor.toArray();
  const total = await db.collection('rental_orders').countDocuments(q);

  const mapped = items.map((r: any) => ({
    id: r._id.toString(),
    racketId: r.racketId?.toString(),
    brand: r.brand || '',
    model: r.model || '',
    status: r.status,
    days: r.days ?? r.period ?? 0,
    amount: r.amount ?? { fee: r.fee ?? 0, deposit: r.deposit ?? 0, total: (r.fee ?? 0) + (r.deposit ?? 0) },
    createdAt: r.createdAt,
    dueAt: r.dueAt,
  }));

  return NextResponse.json({
    page,
    pageSize,
    total,
    items,
  });
}
