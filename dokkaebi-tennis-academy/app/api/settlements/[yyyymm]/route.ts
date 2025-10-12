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
      return NextResponse.json({ success: false, message: 'yyyymm 형식 필요(예: 202510)' }, { status: 400 });
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

    const paid = orders.reduce((s, o: any) => s + (o.paidAmount || 0), 0) + apps.reduce((s, a: any) => s + (a.totalPrice || 0), 0);
    const refund = orders.reduce((s, o: any) => s + (o.refunds || 0), 0) + apps.reduce((s, a: any) => s + (a.refunds || 0), 0);
    const net = paid - refund;

    const snapshot = {
      yyyymm,
      totals: { paid, refund, net },
      breakdown: { orders: orders.length, applications: apps.length },
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
