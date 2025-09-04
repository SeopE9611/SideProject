import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const ALLOWED = new Set([10, 30, 50, 100]);
const PRICE: Record<number, number> = { 10: 100000, 30: 300000, 50: 500000, 100: 1000000 };

function s(v: unknown) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}
function str(v: unknown) {
  return s(v).trim();
}
function num(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function sessionsFromId(idLike: unknown): number {
  const id = str(idLike);
  const m = /^(\d+)-sessions$/i.exec(id);
  return m ? Number(m[1]) : NaN;
}

export async function POST(req: Request) {
  try {
    // 인증
    const at = (await cookies()).get('accessToken')?.value || null;
    const user = at ? verifyAccessToken(at) : null;
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 입력 파싱
    const body: any = await req.json().catch(() => ({}));
    const pkg = body?.packageInfo ?? {};

    // sessions 확보 경로: packageInfo.sessions -> packageId / package -> sessions
    let sessions = num(pkg?.sessions) || sessionsFromId(pkg?.id) || sessionsFromId(body?.packageId) || sessionsFromId(body?.package) || num(body?.sessions);

    if (!Number.isFinite(sessions) || !ALLOWED.has(sessions)) {
      return NextResponse.json({ error: '잘못된 패키지(회수)입니다.' }, { status: 400 });
    }

    // 서버 권위로 금액/메타 구성
    const price = PRICE[sessions];
    if (typeof price !== 'number') {
      return NextResponse.json({ error: '가격 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const planId = str(pkg?.id) || str(body?.packageId) || `${sessions}-sessions`;

    const planTitle = str(pkg?.title) || str(body?.packageTitle) || `${sessions}회권`;

    const serviceMethod = str(body?.serviceInfo?.serviceMethod ?? body?.serviceMethod ?? '방문이용');
    if (/출장/.test(serviceMethod)) {
      return NextResponse.json({ error: '현재 출장 서비스는 이용하실 수 없습니다.' }, { status: 400 });
    }

    const serviceInfo = {
      depositor: str(body?.serviceInfo?.depositor ?? body?.depositor),
      serviceRequest: str(body?.serviceInfo?.serviceRequest),
      serviceMethod,
      address: str(body?.serviceInfo?.address),
      addressDetail: str(body?.serviceInfo?.addressDetail),
      postalCode: str(body?.serviceInfo?.postalCode),
      name: str(body?.serviceInfo?.name),
      phone: str(body?.serviceInfo?.phone),
      email: str(body?.serviceInfo?.email ?? user?.email),
    };

    const paymentInfo = {
      method: '무통장입금',
      bank: str(body?.paymentInfo?.bank ?? body?.bank),
      depositor: serviceInfo.depositor || undefined,
    };

    const packageInfo = {
      id: planId,
      title: planTitle,
      sessions,
      price,
      validityPeriod: Number(body?.validityDays ?? body?.validityPeriod ?? 365),
    };

    const now = new Date();
    const doc = {
      userId: new ObjectId(user.sub),
      createdAt: now,
      updatedAt: now,
      status: '주문접수',
      paymentStatus: '결제대기',
      totalPrice: price,
      packageInfo,
      serviceInfo,
      paymentInfo,
      history: [{ status: '주문접수', date: now, description: `${sessions}회 패키지 주문 접수` }],
      userSnapshot: { name: serviceInfo.name, email: serviceInfo.email },
      meta: {} as any,
    };

    const db = (await clientPromise).db();
    const col = db.collection('packageOrders');

    // Idempotency (안전 버전: 먼저 조회 -> 없으면 insert)
    const idem = req.headers.get('Idempotency-Key') || '';
    if (idem) {
      const exist = await col.findOne({ userId: new ObjectId(user.sub), 'meta.idemKey': idem }, { projection: { _id: 1 } });
      if (exist?._id) {
        return NextResponse.json({ ok: true, packageOrderId: exist._id.toString(), reused: true }, { status: 201 });
      }
      doc.meta.idemKey = idem; // 최초 생성 시에만 세팅
    }

    const ins = await col.insertOne(doc as any);
    return NextResponse.json({ ok: true, packageOrderId: ins.insertedId.toString() }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/packages/orders] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
