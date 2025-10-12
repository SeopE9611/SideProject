import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
// 쿼리: /api/settlements/live?from=2025-10-01&to=0000-00-00
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from'); // yyyy-mm-dd
    const to = url.searchParams.get('to'); // yyyy-mm-dd

    if (!from || !to) {
      return NextResponse.json({ error: 'from,to 쿼리 필요(yyyy-mm-dd)' }, { status: 400 });
    }

    // KST 기준으로 하루 경계 잡기 → UTC로 변환
    function kstDayStartUtc(ymd: string) {
      // ymd: 'YYYY-MM-DD'
      const [y, m, d] = ymd.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, -9, 0, 0)); // KST 00:00 → UTC
    }
    function kstDayEndExclusiveUtc(ymd: string) {
      // 익일 KST 00:00 → UTC (Date.UTC는 날짜 넘침을 자동 처리)
      const [y, m, d] = ymd.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d + 1, -9, 0, 0));
    }

    const start = kstDayStartUtc(from);
    const endExclusive = kstDayEndExclusiveUtc(to);
    const db = await getDb();

    // 저장값 우선 원칙으로 투영 (주문)
    const orders = await db
      .collection('orders')
      .find({ createdAt: { $gte: start, $lt: endExclusive } }, { projection: { paidAmount: 1, refunds: 1 } })
      .toArray();

    // 저장값 우선 원칙으로 투영 (신청)
    const apps = await db
      .collection('stringing_applications')
      .find({ createdAt: { $gte: start, $lt: endExclusive } }, { projection: { totalPrice: 1, refunds: 1 } })
      .toArray();

    const paid = orders.reduce((s, o: any) => s + (o.paidAmount || 0), 0) + apps.reduce((s, a: any) => s + (a.totalPrice || 0), 0);
    const refund = orders.reduce((s, o: any) => s + (o.refunds || 0), 0) + apps.reduce((s, a: any) => s + (a.refunds || 0), 0);
    const net = paid - refund;

    return NextResponse.json({
      range: { from, to },
      totals: { paid, refund, net },
      breakdown: { orders: orders.length, applications: apps.length },
    });
  } catch (e) {
    console.error('[settlements/live]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  }
}
