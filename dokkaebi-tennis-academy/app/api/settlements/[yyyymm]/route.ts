import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
// 월 시작/끝(KST) → UTC 경계로 변환
function kstMonthRangeToUtc(yyyymm: string) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)) - 1; // 0-based
  // KST 00:00은 UTC로 -9시간
  const startUtc = new Date(Date.UTC(y, m, 1, -9, 0, 0)); // y-m-01 KST 00:00 → UTC
  const endUtc = new Date(Date.UTC(y, m + 1, 1, -9, 0, 0)); // 다음달 1일 KST 00:00 → UTC
  return { start: startUtc, end: endUtc };
}

// KST 현재 YYYYMM (예: 202510)
function nowYyyymmKST() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}${parts.month}`;
}

export async function POST(_req: Request, ctx: { params: Promise<{ yyyymm: string }> }) {
  const origin = _req.headers.get('origin') || '';
  const allow = process.env.NEXT_PUBLIC_SITE_URL || ''; // 일단 https://dokkaebi.tennis
  if (origin && !origin.startsWith(allow)) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  try {
    const db = await getDb();

    const { yyyymm } = await ctx.params;

    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    const payload = token ? verifyAccessToken(token) : null;
    const createdBy = payload?.email ?? payload?.sub ?? 'system';

    if (!payload?.sub || payload.role !== 'admin') {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }
    if (!/^\d{6}$/.test(yyyymm)) {
      return NextResponse.json({ message: 'YYYYMM 형식이 아닙니다.' }, { status: 400 });
    }

    // 01~12 월만 허용
    const y = Number(yyyymm.slice(0, 4));
    const m = Number(yyyymm.slice(4, 6));
    if (m < 1 || m > 12) {
      return NextResponse.json({ message: '월은 01~12만 가능합니다.' }, { status: 400 });
    }

    // 미래월 금지(KST 기준)
    const curr = Number(nowYyyymmKST());
    if (Number(yyyymm) > curr) {
      return NextResponse.json({ message: '미래 월 스냅샷은 생성할 수 없습니다.' }, { status: 400 });
    }

    const { start, end } = kstMonthRangeToUtc(yyyymm);

    // 1) 저장값 우선 필드 투영 (orders)
    const orders = await db
      .collection('orders')
      .find({ createdAt: { $gte: start, $lt: end } }, { projection: { paymentStatus: 1, paidAmount: 1, refunds: 1 } })
      .toArray();

    // 2) 저장값 우선 필드 투영 (stringing_applications)
    const apps = await db
      .collection('stringing_applications')
      .find({ createdAt: { $gte: start, $lt: end } }, { projection: { paymentStatus: 1, totalPrice: 1, refunds: 1 } })
      .toArray();

    // 3) 패키지 주문 조회 (결제완료만, createdAt 기준)
    const packages = await db
      .collection('packageOrders')
      .find(
        {
          createdAt: { $gte: start, $lt: end },
          paymentStatus: '결제완료',
        },
        { projection: { totalPrice: 1 } }
      )
      .toArray();

    // 패키지 수금 합계
    const pkgPaid = packages.reduce((s: number, p: any) => s + (p.totalPrice || 0), 0);

    const paid = orders.reduce((s: number, o: any) => s + (o.paidAmount || 0), 0) + apps.reduce((s: number, a: any) => s + (a.totalPrice || 0), 0) + pkgPaid;
    const refund = orders.reduce((s: number, o: any) => s + (o.refunds || 0), 0) + apps.reduce((s: number, a: any) => s + (a.refunds || 0), 0);
    const net = paid - refund;

    const snapshot = {
      yyyymm,
      totals: { paid, refund, net },
      breakdown: { orders: orders.length, applications: apps.length, packages: packages.length },
      // 아래 두 필드는 최초 1회만 기록
      createdAt: new Date(),
      createdBy,
      // 아래 두 필드는 매번 갱신
      lastGeneratedAt: new Date(),
      lastGeneratedBy: createdBy,
    };

    // 멱등
    await db.collection('settlements').updateOne(
      { yyyymm },
      {
        $setOnInsert: { createdAt: snapshot.createdAt, createdBy: snapshot.createdBy },
        $set: {
          totals: snapshot.totals,
          breakdown: snapshot.breakdown,
          lastGeneratedAt: snapshot.lastGeneratedAt,
          lastGeneratedBy: snapshot.lastGeneratedBy,
        },
      },
      { upsert: true }
    );
    return NextResponse.json({ success: true, snapshot });
  } catch (e) {
    console.error('[settlements/:yyyymm]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  }
}

// 스냅샷 삭제 API
export async function DELETE(_req: Request, ctx: { params: Promise<{ yyyymm: string }> }) {
  const origin = _req.headers.get('origin') || '';
  const allow = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (origin && !origin.startsWith(allow)) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  try {
    const db = await getDb();
    const { yyyymm } = await ctx.params;

    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;

    if (!payload?.sub || payload.role !== 'admin') {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    if (!/^\d{6}$/.test(yyyymm)) {
      return NextResponse.json({ success: false, message: 'yyyymm 형식 필요(예: 202510)' }, { status: 400 });
    }

    const result = await db.collection('settlements').deleteOne({ yyyymm });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: '해당 스냅샷을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `${yyyymm} 스냅샷이 삭제되었습니다.` });
  } catch (e) {
    console.error('[settlements/:yyyymm DELETE]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  }
}
