import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { calcOrderEarnPoints } from '@/lib/points.policy';
import { grantPoints } from '@/lib/points.service';

// 사용자: 교체 서비스 확정(교체완료 상태에서만 가능)
// - orderId가 있는 신청(= 주문 기반 신청)은 "주문 구매확정"과 동일한 규칙으로 처리한다.
//   (주문을 구매확정으로 변경 + 포인트 1회 적립 + 연결된 신청도 함께 확정 → 중복 지급 방지)
// - orderId가 없는 신청(= 단독 신청)은 신청 금액 기준으로 포인트 적립
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const jar = await cookies();
  const accessToken = jar.get('accessToken')?.value;
  if (!accessToken) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const payload = verifyAccessToken(accessToken);
  const userId = typeof payload?.sub === 'string' ? payload.sub : null;
  if (!userId || !ObjectId.isValid(userId)) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: 'invalid application id' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();

  try {
    const _id = new ObjectId(id);

    const app = await db.collection('stringing_applications').findOne({ _id });
    if (!app) return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });

    if (String(app.userId) !== String(userId)) {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }

    if (app.status !== '교체완료') {
      return NextResponse.json({ ok: false, message: '교체완료 상태에서만 확정할 수 있습니다.' }, { status: 400 });
    }

    // 주문 기반 신청(orderId 존재)은 "주문 구매확정"과 동일한 규칙으로 처리한다.
    // - 포인트는 주문 totalPrice 기준 1회만 적립(refKey 멱등)
    // - 주문이 구매확정되면, 연결된 신청서도 userConfirmedAt을 함께 찍어 중복 확정을 막는다.
    if (app.orderId) {
      const orderObjectId = app.orderId instanceof ObjectId ? app.orderId : new ObjectId(String(app.orderId));
      const orders = db.collection('orders');

      const order = await orders.findOne({ _id: orderObjectId }, { projection: { userId: 1, status: 1, totalPrice: 1, userConfirmedAt: 1 } as any });

      if (!order) {
        return NextResponse.json({ ok: false, message: '연결된 주문을 찾을 수 없습니다.' }, { status: 404 });
      }

      if (String((order as any).userId) !== String(userId)) {
        return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
      }

      // 이미 주문이 확정된 경우: 신청서도 "표시 목적"으로만 확정 처리(멱등)
      if ((order as any).userConfirmedAt || (order as any).status === '구매확정') {
        await db.collection('stringing_applications').updateOne({ _id, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, { $set: { userConfirmedAt: new Date() } });
        return NextResponse.json({ ok: true, already: true, message: '이미 확정된 주문입니다.', earnedPoints: 0 });
      }

      // 주문 확정은 "배송완료"에서만(기존 구매확정 정책 유지)
      const prevStatus = String((order as any).status ?? '');
      const allowedPrev = prevStatus === '배송완료' || prevStatus === 'delivered';
      if (!allowedPrev) {
        return NextResponse.json({ ok: false, message: '배송완료 상태에서만 확정할 수 있습니다.' }, { status: 400 });
      }

      // 연결된 신청서 중 미완료가 있으면 조기 적립 방지
      const linkedApps = await db
        .collection('stringing_applications')
        .find({ orderId: orderObjectId, status: { $nin: ['draft'] } }, { projection: { _id: 1, status: 1, userConfirmedAt: 1 } as any })
        .toArray();

      const blocking = linkedApps.filter((a: any) => {
        const st = String(a?.status ?? '');
        const confirmed = Boolean(a?.userConfirmedAt);
        const doneLike = confirmed || st === '교체완료' || st === '취소';
        return !doneLike;
      });

      if (blocking.length) {
        return NextResponse.json({ ok: false, message: `아직 완료되지 않은 교체 서비스가 있습니다. (미완료 ${blocking.length}건)` }, { status: 400 });
      }

      const now = new Date();
      const userObjectId = new ObjectId(userId);

      const historyEntry = {
        status: '구매확정',
        date: now.toISOString(),
        description: '사용자 구매 확정(교체서비스 확정에서 처리)',
      };

      // 주문 구매확정(멱등)
      const upd = await orders.updateOne({ _id: orderObjectId, userId: userObjectId, status: { $in: ['배송완료', 'delivered'] }, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, {
        $set: { status: '구매확정', userConfirmedAt: now, updatedAt: now },
        $push: { history: historyEntry },
      } as any);

      if (upd.matchedCount === 0) {
        return NextResponse.json({ ok: true, already: true, message: '이미 확정된 주문입니다.', earnedPoints: 0 });
      }

      const totalPrice = Number((order as any).totalPrice ?? 0);
      const earnedPoints = calcOrderEarnPoints(totalPrice);

      if (earnedPoints > 0) {
        const refKey = `order_reward:${String(orderObjectId)}`;
        try {
          await grantPoints(db, {
            userId: userObjectId,
            amount: earnedPoints,
            type: 'order_reward',
            status: 'confirmed',
            refKey,
            reason: '구매 확정 적립(교체서비스 확정)',
          });
        } catch {
          // refKey 유니크로 중복 적립은 방지됨 → 주문 확정 자체는 유지
        }
      }

      // 연결된 교체 서비스도 함께 확정(멱등)
      const svcRes = await db.collection('stringing_applications').updateMany({ orderId: orderObjectId, status: '교체완료', $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, { $set: { userConfirmedAt: now } });

      return NextResponse.json({
        ok: true,
        message: '서비스 확정 완료',
        earnedPoints,
        alsoConfirmedServices: (svcRes as any).modifiedCount ?? 0,
      });
    }

    if (app.userConfirmedAt) {
      return NextResponse.json({ ok: true, already: true, message: '이미 확정된 신청입니다.', earnedPoints: 0 });
    }

    const now = new Date();

    const totalPrice = Number(app.totalPrice ?? 0);
    const earnedPoints = calcOrderEarnPoints(totalPrice);

    // 포인트가 0원이어도, '확정' 자체는 기록한다(단, now로 한 번만 찍는다).
    if (earnedPoints <= 0) {
      await db.collection('stringing_applications').updateOne({ _id, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, { $set: { userConfirmedAt: now } });
      return NextResponse.json({ ok: true, message: '서비스 확정 완료', earnedPoints: 0 });
    }

    const rewardRefKey = `stringing_application_reward:${String(_id)}`;

    // 포인트 지급이 실패하면(예: DB 오류) 확정도 찍지 않아야 재시도(복구)가 가능하다.
    await grantPoints(db, {
      userId: new ObjectId(userId),
      amount: earnedPoints,
      type: 'order_reward', // PointTransactionType에 이미 있는 값 사용
      status: 'confirmed',
      refKey: rewardRefKey,
      reason: '서비스 확정 적립',
    });

    await db.collection('stringing_applications').updateOne({ _id, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, { $set: { userConfirmedAt: now } });

    return NextResponse.json({ ok: true, message: '서비스 확정 완료', earnedPoints });
  } catch (e) {
    console.error('[stringing confirm] error:', e);
    return NextResponse.json({ ok: false, message: '서비스 확정 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
