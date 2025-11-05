import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!raw) return NextResponse.json({ ok: false, message: 'EMPTY_BODY' }, { status: 400 });
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: 'INVALID_JSON' }, { status: 400 });
  }
  const { racketId, days } = body as { racketId: string; days: 7 | 15 | 30 };
  const db = (await clientPromise).db();
  // 토큰이 있으면 userId 추출
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  const userObjectId = payload?.sub ? new ObjectId(payload.sub) : null;

  // 입력 검증: 허용 기간만 통과
  if (![7, 15, 30].includes(days as any)) {
    return NextResponse.json({ message: '허용되지 않는 대여 기간' }, { status: 400 });
  }

  // 라켓 조회(+요금 정보 포함)
  const racket = await db.collection('used_rackets').findOne({ _id: new ObjectId(racketId) }, { projection: { brand: 1, model: 1, quantity: 1, rental: 1 } });
  if (!racket) {
    return NextResponse.json({ message: '라켓 없음' }, { status: 404 });
  }

  //진행 중 대여 수량 계산: paid|out만 재고 점유
  const activeCount = await db.collection('rental_orders').countDocuments({
    racketId: new ObjectId(racketId),
    status: { $in: ['paid', 'out'] },
  });

  // 잔여 수량 체크
  const quantity = Number(racket.quantity ?? 1);
  if (quantity - activeCount <= 0) {
    // 재고가 0이므로 생성 불가
    return NextResponse.json({ message: '대여 불가 상태(재고 없음)' }, { status: 409 });
  }
  // 요금 계산
  const feeMap = { 7: racket.rental?.fee?.d7 ?? 0, 15: racket.rental?.fee?.d15 ?? 0, 30: racket.rental?.fee?.d30 ?? 0 } as const;
  const fee = feeMap[days] ?? 0;
  const deposit = Number(racket.rental?.deposit ?? 0);
  const amount = { deposit, fee, total: deposit + fee };

  // 반납 예정일
  const now = new Date();
  // const dueAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

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
    // dueAt,
    userId: userObjectId, // 로그인 사용자면 ObjectId, 아니면 null
  };

  const res = await db.collection('rental_orders').insertOne(doc);
  return NextResponse.json({ ok: true, id: res.insertedId.toString() });
}
