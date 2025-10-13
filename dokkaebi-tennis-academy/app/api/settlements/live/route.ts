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
    if (new Date(from) > new Date(to)) {
      return NextResponse.json({ error: '시작일이 종료일보다 늦습니다.' }, { status: 400 });
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

    // 패키지 주문 집계용 조회
    const packages = await db
      .collection('packageOrders')
      .find(
        {
          // 기간 필터: 현재 구조상 결제완료 시각을 별도로 저장 안 하므로 createdAt 기준 사용
          createdAt: { $gte: start, $lt: endExclusive },
          paymentStatus: '결제완료', // 현금 유입 기준
        },
        { projection: { totalPrice: 1 } }
      )
      .toArray();

    // 패키지 결제합 (수금 기준)
    const pkgPaid = packages.reduce((s: number, p: any) => s + (p.totalPrice || 0), 0);

    // paid/net 계산
    const paid = orders.reduce((s, o: any) => s + (o.paidAmount || 0), 0) + apps.reduce((s, a: any) => s + (a.totalPrice || 0), 0) + pkgPaid;

    const refund = orders.reduce((s, o: any) => s + (o.refunds || 0), 0) + apps.reduce((s, a: any) => s + (a.refunds || 0), 0);
    // 패키지 환불은 현재 스키마 미도입 → 0 (향후 추가 시 여기에 반영)
    const net = paid - refund;

    return NextResponse.json({
      range: { from, to },
      totals: { paid, refund, net },
      breakdown: {
        orders: orders.length,
        applications: apps.length,
        packages: packages.length,
      },
    });
  } catch (e) {
    console.error('[settlements/live]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  }
}
