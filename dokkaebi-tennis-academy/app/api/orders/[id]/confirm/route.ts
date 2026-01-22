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
  if (!token) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // verifyAccessToken이 throw되어 500으로 터지는 케이스 방지
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }

  // payload.sub는 ObjectId 문자열이어야 함
  const userIdStr = typeof payload?.sub === 'string' ? payload.sub : null;
  if (!userIdStr || !ObjectId.isValid(userIdStr)) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const userId = new ObjectId(userIdStr);
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

  /**
   * 이미 확정된 주문이라도:
   * - 첫 확정 시 포인트 적립이 실패했을 수 있음(네트워크/DB 일시 오류 등)
   * - 기존 구현은 여기서 바로 return되어 "재시도로 복구 불가" 문제가 생길 수 있음
   * → 이미 확정이어도 grantPoints(refKey)를 멱등으로 재시도 가능하게 처리
   */
  const alreadyConfirmed = Boolean((order as any).userConfirmedAt || (order as any).status === '구매확정');

  const prevStatus = String((order as any).status ?? '');
  const allowedPrev = prevStatus === '배송완료' || prevStatus === 'delivered';
  if (!alreadyConfirmed && !allowedPrev) {
    return NextResponse.json({ ok: false, error: '배송완료 상태에서만 구매 확정이 가능합니다.' }, { status: 400 });
  }

  // --- 묶음 주문(교체 서비스 포함)일 수 있으므로, 연결된 신청 상태를 먼저 확인 ---
  //  - orderId로 연결된 stringing_application이 여러 개일 수 있음(라켓/서비스 복수 신청).
  //  - "교체완료" 또는 "취소"(종결) 상태가 아니고, userConfirmedAt도 없는 신청이 하나라도 있으면
  //    주문 구매확정을 막아 포인트가 조기 적립되는 것을 방지합니다.
  const appsCol = db.collection('stringing_applications');

  // draft는 사용자 플로우 상 임시 상태일 수 있어 구매확정을 막지 않도록 제외(다른 confirm 라우트와 일관성 유지)
  const linkedApps = await appsCol.find({ orderId: orderObjectId, status: { $nin: ['draft'] } }, { projection: { _id: 1, status: 1, userConfirmedAt: 1 } }).toArray();

  // 이미 주문이 확정된 상태라면, 여기서 "미완료 서비스"로 다시 막지는 않음(이미 확정된 상태 유지)
  if (!alreadyConfirmed && linkedApps.length) {
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
        { status: 400 },
      );
    }
  }

  // "이번 요청에서 사용할 확정 시각"
  // - 이미 확정된 주문이라면 userConfirmedAt을 우선 사용(없으면 now)
  const now = new Date();
  const confirmedAt = (order as any).userConfirmedAt ? new Date((order as any).userConfirmedAt) : now;

  // 아직 확정되지 않은 주문만 실제로 주문 문서를 업데이트
  if (!alreadyConfirmed) {
    const historyEntry = {
      status: '구매확정',
      date: confirmedAt.toISOString(),
      description: '사용자 구매 확정',
    };

    const upd = await orders.updateOne({ _id: orderObjectId, userId, status: { $in: ['배송완료', 'delivered'] }, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, {
      $set: { status: '구매확정', userConfirmedAt: confirmedAt, updatedAt: confirmedAt },
      $push: { history: historyEntry },
    } as any);

    // 동시 클릭/중복 요청 등으로 이미 처리된 케이스
    // - 여기서도 "포인트/서비스 확정"은 아래에서 멱등 재시도 가능해야 하므로, return하지 않고 계속 진행
    if (upd.matchedCount === 0) {
      // 이미 확정된 상태로 간주하고 아래 멱등 처리로 이어감
    }
  }

  const totalPrice = Number((order as any).totalPrice ?? 0);
  const earnedPoints = calcOrderEarnPoints(totalPrice);

  // 0원이면 지급 자체 생략
  let pointsGranted = earnedPoints <= 0;
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
      pointsGranted = true;
    } catch {
      // refKey 유니크로 중복 적립은 방지됨.
      // 다만 일시 오류로 적립이 실패했을 수도 있으므로, 이 API를 재호출하면 여기서 다시 시도(멱등) 가능.
      pointsGranted = false;
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
    { $set: { userConfirmedAt: confirmedAt } },
  );

  return NextResponse.json({
    ok: true,
    earnedPoints,
    already: alreadyConfirmed,
    alreadyConfirmed,
    pointsGranted,
    alsoConfirmedServices: (svcRes as any).modifiedCount ?? 0,
  });
}
