import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { parse } from 'date-fns';

// 지난달 yyyymm
function prevYYYMM() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

export async function POST() {
  const secret = (await headers()).get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const yyyymm = prevYYYMM();
  // 내부 로직 재사용: 기존 생성 라우트의 코드를 직접 호출하거나 이 파일에 monthRange+집계 로직을 복붙해도 됩니다.
  // 여기선 컬렉션 쿼리로 간단 집계만 다시 작성:
  const db = await getDb();
  const start = parse(yyyymm, 'yyyyMM', new Date());
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);

  const orders = await db
    .collection('orders')
    .find({ createdAt: { $gte: start, $lt: end } }, { projection: { paidAmount: 1, refunds: 1 } })
    .toArray();

  const apps = await db
    .collection('stringing_applications')
    .find({ createdAt: { $gte: start, $lt: end } }, { projection: { totalPrice: 1, refunds: 1 } })
    .toArray();

  const paid = orders.reduce((s: any, o: any) => s + (o.paidAmount || 0), 0) + apps.reduce((s: any, a: any) => s + (a.totalPrice || 0), 0);
  const refund = orders.reduce((s: any, o: any) => s + (o.refunds || 0), 0) + apps.reduce((s: any, a: any) => s + (a.refunds || 0), 0);
  const net = paid - refund;

  await db.collection('settlements').updateOne(
    { yyyymm },
    {
      $setOnInsert: { createdAt: new Date(), createdBy: 'cron' },
      $set: { totals: { paid, refund, net }, breakdown: { orders: orders.length, applications: apps.length }, lastGeneratedAt: new Date(), lastGeneratedBy: 'cron' },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, yyyymm });
}
