import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const db = (await clientPromise).db();
  const body = await req.json();
  const { racketId, days } = body as { racketId: string; days: 7 | 15 | 30 };

  // 토큰이 있으면 userId 추출
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  const userObjectId = payload?.sub ? new ObjectId(payload.sub) : null;

  // 입력 검증: 허용 기간만 통과
  if (![7, 15, 30].includes(days as any)) {
    return NextResponse.json({ message: '허용되지 않는 대여 기간' }, { status: 400 });
  }

  // 라켓 조회
  const racket = await db.collection('used_rackets').findOne({ _id: new ObjectId(racketId) });
  if (!racket) return NextResponse.json({ message: '라켓 없음' }, { status: 404 });

  // 진행 중(active) 대여건 존재 여부 검사
  // created / paid / out = 아직 반납(returned)되지 않은 상태
  const active = await db.collection('rental_orders').findOne({
    racketId: racket._id,
    status: { $in: ['created', 'paid', 'out'] },
  });
  if (active) {
    return NextResponse.json({ message: '이미 진행 중인 대여가 있습니다.' }, { status: 409 });
  }

  // 라켓 자체 상태로도 차단(판매완료/비노출 등)
  if (['rented', 'sold', 'inactive', '비노출'].includes(racket.status ?? '')) {
    return NextResponse.json({ message: '대여 불가 상태' }, { status: 409 });
  }

  // 요금 계산
  const feeMap = { 7: racket.rental?.fee?.d7 ?? 0, 15: racket.rental?.fee?.d15 ?? 0, 30: racket.rental?.fee?.d30 ?? 0 } as const;
  const fee = feeMap[days] ?? 0;
  const deposit = Number(racket.rental?.deposit ?? 0);
  const amount = { deposit, fee, total: deposit + fee };

  // 반납 예정일
  const now = new Date();
  const dueAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // 대여 주문 생성(status: created) — 결제 완료 시에만 used_rackets.status = 'rented' 로 전환됨
  const doc = {
    racketId: racket._id,
    brand: racket.brand,
    model: racket.model,
    days,
    amount,
    status: 'created', // created -> paid -> out -> returned
    createdAt: now,
    updatedAt: now,
    dueAt,
    // (NEW)
    userId: userObjectId, // 로그인 사용자면 ObjectId, 아니면 null
  };

  const res = await db.collection('rental_orders').insertOne(doc);
  return NextResponse.json({ ok: true, id: res.insertedId.toString() });
}
