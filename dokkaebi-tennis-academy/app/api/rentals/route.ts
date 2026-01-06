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

  const { racketId, days, payment, shipping, refundAccount, stringing } = body as {
    racketId: string;
    days: 7 | 15 | 30;
    payment?: { method: 'bank_transfer'; bank?: string; depositor?: string };
    shipping?: {
      name?: string;
      phone?: string;
      postalCode?: string;
      address?: string;
      addressDetail?: string;
      deliveryRequest?: string;
    };
    refundAccount?: { bank: 'shinhan' | 'kookmin' | 'woori'; account: string; holder: string };
    // 스트링 교체 요청(선택)
    stringing?: { requested?: boolean; stringId?: string };
  };

  const db = (await clientPromise).db();
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  const userObjectId = payload?.sub ? new ObjectId(payload.sub) : null;

  // 입력 검증: 허용 기간만 통과
  if (![7, 15, 30].includes(days as any)) {
    return NextResponse.json({ message: '허용되지 않는 대여 기간' }, { status: 400 });
  }

  // 라켓 조회(+요금 정보 포함)
  const racketObjectId = new ObjectId(racketId);
  const racket = await db.collection('used_rackets').findOne({ _id: racketObjectId }, { projection: { brand: 1, model: 1, quantity: 1, status: 1, rental: 1 } });
  if (!racket) {
    return NextResponse.json({ message: '라켓 없음' }, { status: 404 });
  }

  // --- 스트링 교체 요청 ---
  // 결제 금액에는 반영하지 않고 "요청 + 선택 스트링 스냅샷"만 저장
  let stringingSnap: null | {
    requested: true;
    stringId: ObjectId;
    name: string;
    price: number;
    mountingFee: number;
    image: string | null;
    requestedAt: Date;
  } = null;

  const requested = !!stringing?.requested;
  if (requested) {
    const sid = stringing?.stringId;
    if (!sid || !ObjectId.isValid(sid)) {
      return NextResponse.json({ message: 'BAD_STRING_ID' }, { status: 400 });
    }

    const s = await db.collection('products').findOne({ _id: new ObjectId(sid) }, { projection: { name: 1, price: 1, mountingFee: 1, images: 1 } });
    if (!s) {
      return NextResponse.json({ message: 'STRING_NOT_FOUND' }, { status: 404 });
    }

    const firstImg = Array.isArray((s as any).images) && (s as any).images[0] ? String((s as any).images[0]) : null;

    stringingSnap = {
      requested: true,
      stringId: (s as any)._id,
      name: String((s as any).name ?? ''),
      price: Number((s as any).price ?? 0),
      mountingFee: Number((s as any).mountingFee ?? 0),
      image: firstImg,
      requestedAt: new Date(),
    };
  }

  //진행 중 대여 수량 계산: paid|out만 재고 점유
  const activeCount = await db.collection('rental_orders').countDocuments({
    racketId: racketObjectId,
    status: { $in: ['paid', 'out'] },
  });

  // 단품(<=1)은 status=available일 때만 1개로 취급, 아니면 0개
  const rawQty = Number(racket.quantity ?? 1);
  const baseQty = !Number.isFinite(rawQty) || rawQty <= 1 ? (racket.status === 'available' ? 1 : 0) : rawQty;
  const available = baseQty - activeCount;

  // 잔여 수량 체크
  if (available <= 0) {
    // 재고가 0이므로 생성 불가
    return NextResponse.json({ message: '대여 불가 상태(재고 없음)' }, { status: 409 });
  }
  // 요금 계산
  const feeMap = { 7: racket.rental?.fee?.d7 ?? 0, 15: racket.rental?.fee?.d15 ?? 0, 30: racket.rental?.fee?.d30 ?? 0 } as const;
  const fee = feeMap[days] ?? 0;
  const deposit = Number(racket.rental?.deposit ?? 0);
  const stringPrice = requested ? Number(stringingSnap?.price ?? 0) : 0;
  /**
   *  교체 서비스비(장착비)는 "선택한 스트링 상품의 mountingFee"를 사용
   * - UI(RentalsCheckoutClient)와 서버가 같은 원천 데이터를 보게 만들어
   *   결제요약/DB저장 금액 불일치를 방지
   */
  const stringingFee = requested ? Number(stringingSnap?.mountingFee ?? 0) : 0;

  const amount = {
    deposit,
    fee,
    stringPrice,
    stringingFee,
    total: deposit + fee + stringPrice + stringingFee,
  };

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
    status: 'pending' as const, // pending -> paid -> out -> returned
    createdAt: now,
    updatedAt: now,
    // dueAt,
    userId: userObjectId, // 로그인 사용자면 ObjectId, 아니면 null
    payment: payment ?? null, // 무통장 입금 은행/입금자
    shipping: shipping ?? null, // 배송지 정보
    refundAccount: refundAccount ?? null, // 보증금 환불 계좌
    ...(stringingSnap ? { stringing: stringingSnap } : {}),
  };
  const res = await db.collection('rental_orders').insertOne(doc);
  return NextResponse.json({ ok: true, id: res.insertedId.toString() });
}
