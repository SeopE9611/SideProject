import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { calcOrderEarnPoints } from '@/lib/points.policy';
import { grantPoints } from '@/lib/points.service';

function paymentMethodLabel(method?: string) {
  switch (method) {
    case 'bank_transfer':
      return '무통장 입금';
    case 'card':
      return '카드 결제';
    case 'kakaopay':
      return '카카오페이';
    case 'naverpay':
      return '네이버페이';
    default:
      return method ? String(method) : '';
  }
}

// 사용자: 대여 반납 확정(returned 상태 + 본인 소유)
// - 대여료(fee) 기준으로 포인트 적립
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const jar = await cookies();
  const accessToken = jar.get('accessToken')?.value;
  if (!accessToken) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const payload = verifyAccessToken(accessToken);
  const userId = typeof payload?.sub === 'string' ? payload.sub : null;
  if (!userId || !ObjectId.isValid(userId)) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: 'invalid rental id' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();

  try {
    const _id = new ObjectId(id);

    const rental = await db.collection('rental_orders').findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
    if (!rental) return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });

    if (String(rental.userId) !== String(userId)) {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }

    if (rental.status !== 'returned') {
      return NextResponse.json({ ok: false, message: '반납 완료(반납처리) 상태에서만 확정할 수 있습니다.' }, { status: 400 });
    }

    if (rental.userConfirmedAt) {
      return NextResponse.json({ ok: true, already: true, message: '이미 반납 확정된 대여입니다.', earnedPoints: 0 });
    }

    await db.collection('rental_orders').updateOne({ _id, $or: [{ userConfirmedAt: { $exists: false } }, { userConfirmedAt: null }] }, { $set: { userConfirmedAt: new Date() } });

    const fee = Number(rental?.amount?.fee ?? 0);
    const earnedPoints = calcOrderEarnPoints(fee);

    if (earnedPoints <= 0) {
      return NextResponse.json({ ok: true, message: '반납 확정 완료', earnedPoints: 0 });
    }

    const methodLabel = paymentMethodLabel(rental?.payment?.method);
    const reason = methodLabel ? `대여 확정 적립 (${methodLabel})` : '대여 확정 적립';

    const rewardRefKey = `rental_confirm_reward:${String(_id)}`;
    await grantPoints(db, {
      userId: new ObjectId(userId),
      amount: earnedPoints,
      type: 'rental_confirm_reward',
      reason,
      refKey: rewardRefKey,
    });

    return NextResponse.json({ ok: true, message: '반납 확정 완료', earnedPoints });
  } catch (e) {
    console.error('[rental confirm] error:', e);
    return NextResponse.json({ ok: false, message: '반납 확정 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
