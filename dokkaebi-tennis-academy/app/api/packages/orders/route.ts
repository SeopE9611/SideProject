import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getPackagePricingInfo } from '@/app/features/packages/api/db';

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

    // ✅ 관리자 패키지 설정(허용 회수 / 가격 / 이름) 로드
    const { allowedSessions, priceBySessions, configById } = await getPackagePricingInfo();

    // 클라이언트가 보낸 패키지 ID 후보
    const rawPlanId = str(pkg?.id) || str(body?.packageId) || str(body?.package);

    // 설정에서 해당 ID를 찾아본다 (없으면 undefined)
    const config = rawPlanId ? configById[rawPlanId] : undefined;

    // 세션 수 계산
    let sessions = NaN;

    if (config) {
      // 설정에 ID가 있으면, 그 설정의 sessions를 신뢰
      sessions = config.sessions;
    } else {
      // 설정에 ID가 없으면, 기존 fallback 로직으로 세션 추론
      // (packageInfo.sessions -> ID 파싱 -> body.sessions)
      sessions = num(pkg?.sessions) || sessionsFromId(rawPlanId) || sessionsFromId(body?.packageId) || sessionsFromId(body?.package) || num(body?.sessions);
    }

    // 허용된 세션(활성 패키지)만 주문 가능
    if (!Number.isFinite(sessions) || !allowedSessions.has(sessions)) {
      return NextResponse.json({ error: '잘못된 패키지(회수)입니다.' }, { status: 400 });
    }

    // 서버 권위로 금액 결정 (클라이언트 price는 무시)
    const price = config?.price ?? priceBySessions[sessions];

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: '가격 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // 최종 planId / 이름 구성
    const planId = config?.id || rawPlanId || `${sessions}-sessions`;

    const planTitle = config?.name || str(pkg?.title) || str(body?.packageTitle) || `${sessions}회권`;
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

    const validityPeriod = config?.validityDays != null ? config.validityDays : Number(body?.validityDays ?? body?.validityPeriod ?? 365);

    const packageInfo = {
      id: planId,
      title: planTitle,
      sessions,
      price,
      validityPeriod,
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
