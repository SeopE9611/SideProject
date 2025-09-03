import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const PRICE_MAP: Record<number, number> = {
  10: 100000,
  30: 300000,
  50: 500000,
  100: 1000000,
};

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get('accessToken')?.value;
    const user = token ? verifyAccessToken(token) : null;
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const rawMethod = body?.serviceInfo?.serviceMethod ?? body?.serviceMethod ?? null;
    if (rawMethod === '출장서비스') {
      return NextResponse.json({ error: '현재 출장 서비스는 이용하실 수 없습니다.' }, { status: 400 });
    }

    const planId = body.planId ?? body.packageInfo?.id;
    const sessions = Number(body.packageSize ?? body.packageInfo?.sessions);
    const planTitle = body.planTitle ?? body.packageInfo?.title ?? (sessions ? `교체 서비스 패키지 ${sessions}회권` : undefined);
    const depositor = body.depositor ?? body.serviceInfo?.depositor ?? null;
    const bank = body.bank ?? body.paymentInfo?.bank ?? null;

    if (!planId || !sessions || !PRICE_MAP[sessions]) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // 가격은 서버에서 고정
    const price = PRICE_MAP[sessions];

    const packageInfo = {
      id: planId,
      title: planTitle ?? '교체 서비스 패키지',
      sessions,
      price,
      validityPeriod: 365,
    };

    const serviceInfo = {
      depositor,
      serviceRequest: body?.serviceInfo?.serviceRequest ?? null,
      serviceMethod: body?.serviceInfo?.serviceMethod ?? null,
      address: body?.serviceInfo?.address ?? null,
      addressDetail: body?.serviceInfo?.addressDetail ?? null,
      postalCode: body?.serviceInfo?.postalCode ?? null,
    };

    //서버 방어용 출장 서비스 금지
    if (serviceInfo.serviceMethod === '출장서비스') {
      return NextResponse.json({ error: '현재 출장 서비스는 이용하실 수 없습니다.' }, { status: 400 });
    }

    const paymentInfo = {
      method: '무통장입금',
      bank: bank ?? null,
      depositor: depositor ?? null,
    };

    const now = new Date();
    const db = (await clientPromise).db();

    const doc = {
      userId: new ObjectId(user.sub),
      createdAt: now,
      updatedAt: now,
      status: '주문접수', // 패키지 전용 상태
      paymentStatus: '결제대기',
      totalPrice: price,
      packageInfo,
      serviceInfo,
      paymentInfo,
      history: [{ status: '주문접수', date: now, description: `${sessions}회 패키지 주문 접수` }],
      userSnapshot: { name: user.name ?? '', email: user.email ?? '' },
    };

    const ins = await db.collection('packageOrders').insertOne(doc as any);

    return NextResponse.json({ ok: true, packageOrderId: ins.insertedId.toString() }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/packages/orders] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
