import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { canTransitIdempotent } from '@/app/features/rentals/utils/status';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  // 인증
  const at = (await cookies()).get('accessToken')?.value;
  if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // 파라미터
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Bad Request' }, { status: 400 });

  const db = (await clientPromise).db();
  const doc = await db.collection('rental_orders').findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(payload.sub), // 소유자 검증(중요)
  });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 응답 평탄화
  return NextResponse.json({
    id: doc._id.toString(),
    racketId: doc.racketId?.toString?.(),
    brand: doc.brand,
    model: doc.model,
    days: doc.days,
    status: typeof doc.status === 'string' ? doc.status.toLowerCase() : doc.status, // pending | paid | out | returned
    amount: doc.amount, // { fee, deposit, total }
    createdAt: doc.createdAt,
    outAt: doc.outAt ?? null, // 출고 시각
    dueAt: doc.dueAt ?? null, // 반납 예정
    returnedAt: doc.returnedAt ?? null, // 반납 완료
    depositRefundedAt: doc.depositRefundedAt ?? null, // 보증금 환불 시각
    shipping: {
      // 운송장/배송 정보
      outbound: doc.shipping?.outbound ?? null,
      return: doc.shipping?.return ?? null,
    },
    cancelRequest: doc.cancelRequest ?? null,
  });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  // 인증
  const at = (await cookies()).get('accessToken')?.value;
  if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // 파라미터
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Bad Request' }, { status: 400 });

  // 본인 소유 대여건 조회
  const db = (await clientPromise).db();
  const rentals = db.collection('rental_orders');
  const doc = await rentals.findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(payload.sub), // 소유자 검증(중요)
  });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  const current = (doc as any).status ?? 'pending';

  // 멱등: 이미 취소 상태면 200 그대로
  if (current === 'canceled') {
    return NextResponse.json({ id, status: 'canceled', message: '이미 취소된 대여건입니다.' });
  }

  // 전이 가능 여부 + created 상태에서만 허용
  if (!canTransitIdempotent(current, 'canceled') || current !== 'pending') {
    return NextResponse.json({ message: '현재 상태에서는 취소할 수 없습니다.', status: current }, { status: 409 });
  }

  // 상태 전이 수행
  const now = new Date().toISOString();
  await rentals.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'canceled', canceledAt: now } });

  // 라켓 예약/가용성 되돌리기 로직이 있다면 여기서 처리
  // const rackets = db.collection('used_rackets');
  // await rackets.updateOne({ _id: doc.racketId }, { $set: { reserved: false } });

  return NextResponse.json({ id, status: 'canceled' });
}
