import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { parse } from 'date-fns';

function monthRange(yyyymm: string) {
  const start = parse(yyyymm, 'yyyyMM', new Date()); // 월 1일 00:00
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);
  return { start, end };
}

export async function POST(_: Request, { params }: { params: { yyyymm: string } }) {
  const db = await getDb();
  const { start, end } = monthRange(params.yyyymm);

  // 1) 저장값 우선 필드만 투영 (orders)
  const orders = await db
    .collection('orders')
    .find({ createdAt: { $gte: start, $lt: end } }, { projection: { paymentStatus: 1, paidAmount: 1, refunds: 1 } })
    .toArray();

  // 2) 저장값 우선 필드만 투영 (stringing_applications)
  const apps = await db
    .collection('stringing_applications')
    .find({ createdAt: { $gte: start, $lt: end } }, { projection: { paymentStatus: 1, totalPrice: 1, refunds: 1 } })
    .toArray();

  const paid = orders.reduce((s, o) => s + (o.paidAmount || 0), 0) + apps.reduce((s, a) => s + (a.totalPrice || 0), 0);
  const refund = orders.reduce((s, o) => s + (o.refunds || 0), 0) + apps.reduce((s, a) => s + (a.refunds || 0), 0);
  const net = paid - refund;

  const snapshot = {
    yyyymm: params.yyyymm,
    totals: { paid, refund, net },
    breakdown: { orders: orders.length, applications: apps.length },
    createdAt: new Date(),
  };

  await db.collection('settlements').updateOne({ yyyymm: params.yyyymm }, { $set: snapshot }, { upsert: true });

  return NextResponse.json({ success: true, snapshot });
}
