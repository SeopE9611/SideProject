import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { orderPaidAmount, applicationPaidAmount, refundsAmount, isStandaloneStringingApplication, buildPaidMatch, buildRentalPaidMatch, rentalPaidAmount, rentalDepositAmount } from '@/app/api/settlements/_lib/settlementPolicy';

function withDeprecation(res: NextResponse) {
  res.headers.set('Deprecation', 'true');
  res.headers.set('Sunset', 'Wed, 31 Dec 2026 14:59:59 GMT');
  res.headers.set('Link', '</api/admin/settlements/live>; rel="successor-version"');
  return res;
}

// 쿼리: /api/settlements/live?from=YYYY-MM-DD&to=YYYY-MM-DD (KST 기준)
export async function GET(req: Request) {
  try {
    // 1) 관리자 인증 (정산 데이터는 매출/운영 정보이므로 반드시 관리자만 조회)
    const g = await requireAdmin(req);
    if (!g.ok) return withDeprecation(g.res);
    const db = g.db;

    const url = new URL(req.url);
    const from = url.searchParams.get('from'); // yyyy-mm-dd
    const to = url.searchParams.get('to'); // yyyy-mm-dd

    if (!from || !to) {
      return withDeprecation(NextResponse.json({ error: 'from,to 쿼리 필요(yyyy-mm-dd)' }, { status: 400 }));
    }
    if (new Date(from) > new Date(to)) {
      return withDeprecation(NextResponse.json({ error: '시작일이 종료일보다 늦습니다.' }, { status: 400 }));
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
    const paidMatch = buildPaidMatch(['paymentStatus', 'paymentInfo.status']);

    const orders = await db
      .collection('orders')
      .find({ $and: [{ createdAt: { $gte: start, $lt: endExclusive } }, paidMatch] }, { projection: { paidAmount: 1, totalPrice: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } })
      .toArray();

    const apps = await db
      .collection('stringing_applications')
      .find({ $and: [{ createdAt: { $gte: start, $lt: endExclusive } }, paidMatch] }, { projection: { totalPrice: 1, serviceAmount: 1, orderId: 1, rentalId: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } })
      .toArray();

    const packages = await db
      .collection('packageOrders')
      .find({ $and: [{ createdAt: { $gte: start, $lt: endExclusive } }, paidMatch] }, { projection: { totalPrice: 1, paidAmount: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } })
      .toArray();

    const rentals = await db
      .collection('rental_orders')
      .find(
        {
          $and: [{ createdAt: { $gte: start, $lt: endExclusive } }, buildRentalPaidMatch()],
        },
        { projection: { status: 1, paidAt: 1, payment: 1, amount: 1, createdAt: 1 } },
      )
      .toArray();

    const standaloneApps = apps.filter((a: any) => isStandaloneStringingApplication(a));

    const paidOrders = orders.reduce((s, o: any) => s + orderPaidAmount(o), 0);
    const paidApps = standaloneApps.reduce((s, a: any) => s + applicationPaidAmount(a), 0);
    const pkgPaid = packages.reduce((s: number, p: any) => s + orderPaidAmount(p), 0);
    const rentalPaid = rentals.reduce((s: number, r: any) => s + rentalPaidAmount(r), 0);
    const rentalDeposit = rentals.reduce((s: number, r: any) => s + rentalDepositAmount(r), 0);
    const paid = paidOrders + paidApps + pkgPaid + rentalPaid;

    const refundOrders = orders.reduce((s: number, o: any) => s + refundsAmount(o), 0);
    const refundApps = standaloneApps.reduce((s: number, a: any) => s + refundsAmount(a), 0);
    const refundPackages = packages.reduce((s: number, p: any) => s + refundsAmount(p), 0);
    const refund = refundOrders + refundApps + refundPackages;
    const net = paid - refund;

    return withDeprecation(
      NextResponse.json({
        range: { from, to },
        totals: { paid, refund, net, rentalDeposit },
        breakdown: {
          orders: orders.length,
          applications: standaloneApps.length,
          packages: packages.length,
          rentals: rentals.length,
        },
      }),
    );
  } catch (e) {
    console.error('[settlements/live]', e);
    return withDeprecation(NextResponse.json({ message: 'internal_error' }, { status: 500 }));
  }
}
