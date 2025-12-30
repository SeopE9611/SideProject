import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { calcOrderEarnPoints } from '@/lib/points.policy';
import { grantPoints } from '@/lib/points.service';

// 사용자: 교체 서비스 확정(교체완료 상태에서만 가능)
// - orderId가 있는 신청(= 주문 기반 신청)은 "주문 구매확정"(단 1회)에서 함께 확정되므로 여기서는 차단
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

    // 주문 기반 신청은 "주문 구매확정"(단 1회 확정)으로만 처리한다.
    // - 사용자가 이 엔드포인트를 직접 호출해도 중복 확정/중복 적립이 발생하지 않도록 서버에서 차단
    if (app.orderId) {
      return NextResponse.json(
        {
          ok: false,
          message: '주문과 함께 결제된 교체 서비스는 주문의 "구매확정"에서 확정됩니다.',
        },
        { status: 400 }
      );
    }

    if (app.userConfirmedAt) {
      return NextResponse.json({ ok: true, already: true, message: '이미 확정된 신청입니다.', earnedPoints: 0 });
    }

    await db.collection('stringing_applications').updateOne({ _id, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, { $set: { userConfirmedAt: new Date() } });

    const totalPrice = Number(app.totalPrice ?? 0);
    const earnedPoints = calcOrderEarnPoints(totalPrice);

    if (earnedPoints <= 0) {
      return NextResponse.json({ ok: true, message: '서비스 확정 완료', earnedPoints: 0 });
    }

    const rewardRefKey = `stringing_application_reward:${String(_id)}`;
    await grantPoints(db, {
      userId: new ObjectId(userId),
      amount: earnedPoints,
      type: 'service_confirm_reward',
      refKey: rewardRefKey,
      reason: '서비스 확정 적립',
    });

    return NextResponse.json({ ok: true, message: '서비스 확정 완료', earnedPoints });
  } catch (e) {
    console.error('[stringing confirm] error:', e);
    return NextResponse.json({ ok: false, message: '서비스 확정 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
