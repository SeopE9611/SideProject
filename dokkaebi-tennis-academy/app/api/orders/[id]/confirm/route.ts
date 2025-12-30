import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { calcOrderEarnPoints } from '@/lib/points.policy';
import { grantPoints } from '@/lib/points.service';
import { bankLabelMap } from '@/lib/constants';

function paymentMethodLabel(paymentInfo: any): string {
  const method = String(paymentInfo?.method ?? '').trim();
  if (!method) return '결제수단 미상';

  // 프로젝트에서 method가 한글(예: "무통장 입금")로 들어오는 케이스가 많음 → 그대로 사용
  if (method === '무통장 입금') {
    const bankRaw = String(paymentInfo?.bank ?? '').trim();
    const bankLabel = (bankLabelMap as any)?.[bankRaw] ?? bankRaw;
    return bankLabel ? `무통장 입금/${bankLabel}` : '무통장 입금';
  }

  // 혹시 영문 코드가 들어오는 케이스 대비
  const m = method.toLowerCase();
  if (m === 'bank_transfer' || m === 'bank' || m === 'vbank') {
    const bankRaw = String(paymentInfo?.bank ?? '').trim();
    const bankLabel = (bankLabelMap as any)?.[bankRaw] ?? bankRaw;
    return bankLabel ? `무통장 입금/${bankLabel}` : '무통장 입금';
  }
  if (m.includes('kakao')) return '카카오페이';
  if (m.includes('naver')) return '네이버페이';
  if (m.includes('toss')) return '토스페이';
  if (m.includes('card')) return '카드';

  return method; // 마지막 fallback (프로젝트 내부 표기 유지)
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: '유효하지 않은 주문 ID입니다.' }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const userId = new ObjectId(String(payload.sub));
  const orderObjectId = new ObjectId(id);

  const client = await clientPromise;
  const db = client.db();
  const orders = db.collection('orders');

  const order = await orders.findOne({ _id: orderObjectId }, { projection: { userId: 1, status: 1, totalPrice: 1, paymentInfo: 1, userConfirmedAt: 1 } });

  if (!order) {
    return NextResponse.json({ ok: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (String((order as any).userId) !== String(userId)) {
    return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 403 });
  }

  // 이미 확정된 경우(프론트에서 alreadyConfirmed로 처리)
  if ((order as any).userConfirmedAt || (order as any).status === '구매확정') {
    return NextResponse.json({ ok: true, already: true, alreadyConfirmed: true, earnedPoints: 0 });
  }

  const prevStatus = String((order as any).status ?? '');
  const allowedPrev = prevStatus === '배송완료' || prevStatus === 'delivered';
  if (!allowedPrev) {
    return NextResponse.json({ ok: false, error: '배송완료 상태에서만 구매 확정이 가능합니다.' }, { status: 400 });
  }

  // --- 묶음 주문(교체 서비스 포함)일 수 있으므로, 연결된 신청 상태를 먼저 확인 ---
  //  - orderId로 연결된 stringing_application이 여러 개일 수 있음(라켓/서비스 복수 신청).
  //  - "교체완료" 또는 "취소"(종결) 상태가 아니고, userConfirmedAt도 없는 신청이 하나라도 있으면
  //    주문 구매확정을 막아 포인트가 조기 적립되는 것을 방지합니다.
  const appsCol = db.collection('stringing_applications');
  const linkedApps = await appsCol.find({ orderId: orderObjectId }, { projection: { _id: 1, status: 1, userConfirmedAt: 1 } }).toArray();

  if (linkedApps.length) {
    const blocking = linkedApps.filter((a: any) => {
      const st = String(a?.status ?? '');
      const confirmed = Boolean(a?.userConfirmedAt);
      const doneLike = confirmed || st === '교체완료' || st === '취소';
      return !doneLike;
    });

    if (blocking.length) {
      return NextResponse.json(
        {
          ok: false,
          error: `교체 서비스가 아직 완료되지 않았습니다. (미완료 ${blocking.length}건) 서비스 완료 후 구매확정이 가능합니다.`,
        },
        { status: 400 }
      );
    }
  }

  const now = new Date();
  const historyEntry = {
    status: '구매확정',
    date: now.toISOString(),
    description: '사용자 구매 확정',
  };

  const upd = await orders.updateOne({ _id: orderObjectId, userId, status: { $in: ['배송완료', 'delivered'] }, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, {
    $set: { status: '구매확정', userConfirmedAt: now, updatedAt: now },
    $push: { history: historyEntry },
  } as any);

  // 동시 클릭/중복 요청 등으로 이미 처리된 케이스
  if (upd.matchedCount === 0) {
    return NextResponse.json({ ok: true, already: true, alreadyConfirmed: true, earnedPoints: 0 });
  }

  const totalPrice = Number((order as any).totalPrice ?? 0);
  const earnedPoints = calcOrderEarnPoints(totalPrice);

  // 0원이면 지급 자체 생략
  if (earnedPoints > 0) {
    const methodLabel = paymentMethodLabel((order as any).paymentInfo);
    const refKey = `order_reward:${String(orderObjectId)}`;

    try {
      await grantPoints(db, {
        userId,
        amount: earnedPoints,
        type: 'order_reward',
        status: 'confirmed',
        refKey,
        reason: `구매 확정 적립 (${methodLabel})`,
      });
    } catch {
      // refKey 유니크로 중복 적립은 방지됨. 여기서는 주문 확정 자체를 실패시키지 않음.
    }
  }

  // 주문 구매확정이 완료되면, 주문과 연결된 교체 서비스 신청도 '구매확정 묶음' 관점에서 함께 확정 처리합니다.
  // (단, 이미 확정된 경우는 건드리지 않습니다)
  const svcRes = await db.collection('stringing_applications').updateMany(
    {
      orderId: orderObjectId,
      status: '교체완료',
      $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }],
    },
    { $set: { userConfirmedAt: now } }
  );

  return NextResponse.json({ ok: true, earnedPoints, alsoConfirmedServices: (svcRes as any).modifiedCount ?? 0 });
}
