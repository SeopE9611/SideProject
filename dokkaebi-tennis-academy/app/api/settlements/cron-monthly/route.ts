import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDb } from '@/lib/mongodb';

// KST 00:00을 UTC로 보정해 월 경계 계산 (DST 없음 가정: KST=UTC+9)
function kstMonthRangeToUtc(yyyymm: string) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)) - 1; // 0-based month
  // KST 1일 00:00 → UTC는 -9시간
  const startUtc = new Date(Date.UTC(y, m, 1, -9, 0, 0));
  const endUtc = new Date(Date.UTC(y, m + 1, 1, -9, 0, 0)); // 다음달 1일 00:00 (KST) → UTC
  return { start: startUtc, end: endUtc };
}

// (선택) "지난달" 계산도 KST '오늘' 기준으로 하고 싶으면:
function nowInKst() {
  const utc = new Date();
  // UTC + 9시간 = KST
  return new Date(utc.getTime() + 9 * 60 * 60 * 1000);
}
function prevYYYMM_KST() {
  const kst = nowInKst();
  const y = kst.getFullYear();
  const m = kst.getMonth(); // 0-based (KST)
  // 지난달
  const d = new Date(y, m - 1, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 지난달 yyyymm
function prevYYYMM() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

export async function POST() {
  try {
    const secret = (await headers()).get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const yyyymm = prevYYYMM_KST(); // 또는 기존 prevYYYMM() 그대로 사용해도 OK
    const { start, end } = kstMonthRangeToUtc(yyyymm);

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

    console.log('[cron-monthly]', {
      yyyymm,
      totals: { paid, refund, net },
      counts: { orders: orders.length, apps: apps.length },
      at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, yyyymm });
  } catch (e) {
    console.error('[cron-monthly]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  }
}
