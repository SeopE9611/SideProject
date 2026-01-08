import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { deductPoints, getPointsSummary } from '@/lib/points.service';

export const dynamic = 'force-dynamic';

// 주문 체크아웃과 동일한 포인트 사용 단위(=100P 단위)
const POINT_UNIT = 100;

export async function POST(req: Request) {
  const raw = await req.text();
  if (!raw) return NextResponse.json({ ok: false, message: 'EMPTY_BODY' }, { status: 400 });
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: 'INVALID_JSON' }, { status: 400 });
  }

  const { racketId, days, payment, shipping, refundAccount, stringing, pointsToUse, servicePickupMethod } = body as {
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

    // 포인트 사용 (주문 체크아웃과 동일: 100P 단위)
    pointsToUse?: number;

    // 교체 신청서(/services/apply)에서 기본 수거/방문 방식을 결정하는 값
    // - SELF_SEND: 택배로 보내기(자가 발송)
    // - SHOP_VISIT: 매장 방문(방문 시간 선택 UI가 열리는 쪽)
    // (하위 호환) delivery/pickup 값도 허용
    servicePickupMethod?: 'SELF_SEND' | 'SHOP_VISIT' | 'delivery' | 'pickup';
  };

  const client = await clientPromise;
  const db = client.db();
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  const userObjectId = payload?.sub ? new ObjectId(payload.sub) : null;

  // --- 공통 입력 정리 ---
  // (1) 수령 방식: RentalsCheckoutClient에서 보내는 값(SELF_SEND/SHOP_VISIT)을 기준으로 저장
  // - SELF_SEND: 택배로 보내기(자가 발송)
  // - SHOP_VISIT: 매장 방문(방문 시간 선택 UI가 열리는 쪽)
  // (하위 호환) 과거 값 delivery/pickup 도 허용
  const rawPickup = servicePickupMethod ?? null;

  let pickupMethod: 'SELF_SEND' | 'SHOP_VISIT';
  if (!rawPickup) {
    // 값이 없으면 shipping.shippingMethod를 기준으로 기본값을 맞춤
    pickupMethod = shipping?.shippingMethod === 'pickup' ? 'SHOP_VISIT' : 'SELF_SEND';
  } else if (rawPickup === 'SHOP_VISIT' || rawPickup === 'SELF_SEND') {
    pickupMethod = rawPickup;
  } else if (rawPickup === 'pickup') {
    pickupMethod = 'SHOP_VISIT';
  } else if (rawPickup === 'delivery') {
    pickupMethod = 'SELF_SEND';
  } else {
    return NextResponse.json({ ok: false, message: 'INVALID_PICKUP_METHOD' }, { status: 400 });
  }

  // (2) 포인트: 숫자/정수/단위(100P) 정규화
  const requestedPointsRaw = Number(pointsToUse ?? 0);
  const requestedPoints = Number.isFinite(requestedPointsRaw) ? Math.max(0, Math.floor(requestedPointsRaw)) : 0;
  const normalizedRequestedPointsToUse = Math.floor(requestedPoints / POINT_UNIT) * POINT_UNIT;

  // 로그인하지 않았는데 포인트를 쓰려는 경우는 거절
  if (!userObjectId && normalizedRequestedPointsToUse > 0) {
    return NextResponse.json({ ok: false, message: 'LOGIN_REQUIRED_FOR_POINTS' }, { status: 401 });
  }

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

  // --- 포인트 적용 (보증금 제외) ---
  // 정책: 보증금(deposit)은 포인트 적용 제외
  const originalTotal = Number(amount.total ?? 0);
  const maxPointsByPolicy = Math.max(0, originalTotal - deposit);

  let pointsUsed = 0;
  if (userObjectId && normalizedRequestedPointsToUse > 0) {
    const summary = await getPointsSummary(db, userObjectId);

    // pointsDebt가 남아있으면(=음수 잔액 상환 중) 사용을 막음
    if (summary.debt > 0) {
      return NextResponse.json({ ok: false, message: 'POINTS_DEBT_EXISTS' }, { status: 409 });
    }

    // 사용 가능 포인트와 정책상 최대치(=보증금 제외 금액) 중 더 작은 값까지만 허용
    const maxSpendable = Math.min(summary.available, maxPointsByPolicy);
    pointsUsed = Math.min(normalizedRequestedPointsToUse, maxSpendable);
  }

  // 최종 결제 금액(=포인트 차감 후)
  const payableTotal = Math.max(0, originalTotal - pointsUsed);
  const finalAmount = { ...amount, total: payableTotal };

  // 반납 예정일
  const now = new Date();
  // const dueAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // 대여 주문 생성(status: pending) — 결제 완료 시에만 used_rackets.status = 'rented' 로 전환됨
  // 여기서 amount.total은 "포인트 차감 후 최종 결제 금액"으로 저장
  const doc = {
    racketId: racket._id,
    brand: racket.brand,
    model: racket.model,
    days,
    amount: finalAmount,
    originalTotal,
    pointsUsed,
    servicePickupMethod: pickupMethod,
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

  // --- 포인트 즉시 차감 + 대여 주문 생성은 같은 트랜잭션으로 묶어서 처리 ---
  // (insert는 되었는데 포인트 차감이 실패하는...) 같은 찢김을 방지
  const session = client.startSession();
  try {
    let insertedId: ObjectId | null = null;

    await session.withTransaction(async () => {
      const res = await db.collection('rental_orders').insertOne(doc, { session });
      insertedId = res.insertedId;
      const rentalIdStr = String(res.insertedId);
      if (pointsUsed > 0 && userObjectId) {
        // refKey를 rental:* 로 둬서 "주문" 상세 링크로 잘못 연결되는 것을 방지
        await deductPoints(
          db,
          {
            userId: userObjectId,
            amount: pointsUsed,
            type: 'spend_on_order', // 기존 포인트 타입 재사용(라벨: '포인트 사용')
            refKey: `rental:${rentalIdStr}:spend`,
            reason: `라켓 대여 결제 포인트 사용 (대여ID: ${rentalIdStr})`,
          },
          { session }
        );
      }
    });

    if (!insertedId) throw new Error('RENTAL_INSERT_FAILED');
    return NextResponse.json({ ok: true, id: String(insertedId) });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
    // deductPoints가 던지는 대표 에러 메시지를 그대로 프론트로 전달
    // - INSUFFICIENT_POINTS
    // - POINTS_DEBT_EXISTS
    return NextResponse.json({ ok: false, message: msg }, { status: 409 });
  } finally {
    await session.endSession();
  }
}
