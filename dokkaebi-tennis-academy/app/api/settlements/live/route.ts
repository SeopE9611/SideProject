import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { orderPaidAmount, applicationPaidAmount, refundsAmount, isStandaloneStringingApplication, buildPaidMatch, buildRentalPaidMatch, rentalPaidAmount, rentalDepositAmount } from '@/app/api/settlements/_lib/settlementPolicy';

// 쿼리: /api/settlements/live?from=YYYY-MM-DD&to=YYYY-MM-DD (KST 기준)
export async function GET(req: Request) {
  try {
    // 1) 관리자 인증 (정산 데이터는 매출/운영 정보이므로 반드시 관리자만 조회)
    const g = await requireAdmin(req);
    if (!g.ok) return g.res;
    const db = g.db;

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
    const paidMatch = buildPaidMatch(['paymentStatus', 'paymentInfo.status']);

    // 저장값 우선 원칙으로 투영 (주문)
    // - paymentStatus는 '유료(수금 완료)'만 정산에 포함
    const orders = await db
      .collection('orders')
      .find({ $and: [{ createdAt: { $gte: start, $lt: endExclusive } }, paidMatch] }, { projection: { paidAmount: 1, totalPrice: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } })
      .toArray();

    // 저장값 우선 원칙으로 투영 (신청)
    // - orderId/rentalId가 있으면 '연결된 통합건'이므로 정산에서 제외(중복 방지)
    const apps = await db
      .collection('stringing_applications')
      .find({ $and: [{ createdAt: { $gte: start, $lt: endExclusive } }, paidMatch] }, { projection: { totalPrice: 1, serviceAmount: 1, orderId: 1, rentalId: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } })
      .toArray();

    // 패키지 주문 집계용 조회
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

    // paid/net 계산
    const paidOrders = orders.reduce((s, o: any) => s + orderPaidAmount(o), 0);
    const paidApps = standaloneApps.reduce((s, a: any) => s + applicationPaidAmount(a), 0);
    const pkgPaid = packages.reduce((s: number, p: any) => s + orderPaidAmount(p), 0);
    const rentalPaid = rentals.reduce((s: number, r: any) => s + rentalPaidAmount(r), 0);
    const rentalDeposit = rentals.reduce((s: number, r: any) => s + rentalDepositAmount(r), 0);

    /**
     * 실시간 정산 총매출(paid)에는 대여 매출도 포함되어야 한다.
     * (보증금은 rentalPaidAmount에서 제외하고, rentalDeposit으로 별도 표시)
     */
    const paid = paidOrders + paidApps + pkgPaid + rentalPaid;

    // refund 계산
    // - paid에서 제외된 '연결된 신청서'는 refund에서도 제외(같은 이유로 중복 방지)
    const refundOrders = orders.reduce((s: number, o: any) => s + refundsAmount(o), 0);
    const refundApps = standaloneApps.reduce((s: number, a: any) => s + refundsAmount(a), 0);
    const refundPackages = packages.reduce((s: number, p: any) => s + refundsAmount(p), 0);
    const refund = refundOrders + refundApps + refundPackages;
    const net = paid - refund;

    return NextResponse.json({
      range: { from, to },
      totals: { paid, refund, net, rentalDeposit },
      breakdown: {
        orders: orders.length,
        applications: standaloneApps.length,
        packages: packages.length,
        rentals: rentals.length,
      },
    });
  } catch (e) {
    console.error('[settlements/live]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  }
}
