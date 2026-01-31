import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { deductPoints, getPointsSummary } from '@/lib/points.service';
import { createStringingApplicationFromRental } from '@/app/features/stringing-applications/api/create-from-rental';
import { ensureStringingTTLIndexes } from '@/app/features/stringing-applications/api/indexes';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 주문 체크아웃과 동일한 포인트 사용 단위(=100P 단위)
const POINT_UNIT = 100;

const POSTAL_RE = /^\d{5}$/;
const ALLOWED_BANKS = new Set(['shinhan', 'kookmin', 'woori'] as const);

//  대여 기간 허용 값(서버 최종 방어 + TS 타입 확정)
const AllowedDaysSchema = z.union([z.literal(7), z.literal(15), z.literal(30)]);

// 문자열 정리/숫자만 추출(서버 방어)
const toTrimmedString = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const toDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, '');

/**
 * 대여 생성 요청 스키마(서버 최종 방어)
 * - 목적: JSON 파싱 이후 "타입/형식/필수값"을 강제해 500을 400으로 정리
 * - 주의: 기존 로직을 바꾸지 않기 위해, 필요한 필드만 강제하고 나머지는 passthrough로 허용
 */
const RentalsCreateBodySchema = z
  .object({
    racketId: z
      .string()
      .trim()
      .min(1)
      .refine((s) => ObjectId.isValid(s), { message: 'BAD_RACKET_ID' }),
    days: z.coerce.number().pipe(AllowedDaysSchema),

    pointsToUse: z.coerce.number().optional(),
    servicePickupMethod: z.enum(['SELF_SEND', 'SHOP_VISIT', 'delivery', 'pickup']).optional(),

    payment: z
      .object({
        method: z.literal('bank_transfer'),
        bank: z.string().trim().min(1),
        depositor: z.string().trim().min(2),
      })
      .passthrough(),

    shipping: z
      .object({
        name: z.string().trim().min(2),
        phone: z.preprocess(toDigits, z.string().min(10).max(11)),
        postalCode: z.preprocess(toDigits, z.string().regex(POSTAL_RE)),
        address: z.string().trim().min(1),
        addressDetail: z.string().trim().optional(),
        deliveryRequest: z.string().trim().optional(),
        // 레거시/하위호환
        shippingMethod: z.enum(['pickup', 'delivery']).optional(),
      })
      .passthrough(),

    refundAccount: z
      .object({
        bank: z.enum(['shinhan', 'kookmin', 'woori']),
        account: z.preprocess(toDigits, z.string().min(8).max(20)),
        holder: z.string().trim().min(2),
      })
      .passthrough(),

    // 스트링 교체 요청(선택)
    stringing: z
      .object({
        requested: z.coerce.boolean().optional(),
        stringId: z.string().trim().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export async function POST(req: Request) {
  const raw = await req.text();
  if (!raw) return NextResponse.json({ ok: false, message: 'EMPTY_BODY' }, { status: 400 });
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: 'INVALID_JSON' }, { status: 400 });
  }

  // 서버 최종 스키마 검증(여기서 500을 400으로 정리)
  const parsed = RentalsCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues ?? [];

    // racketId 불량 → 400 (ObjectId 생성 전에 차단)
    if (issues.some((i) => i.message === 'BAD_RACKET_ID')) {
      return NextResponse.json({ ok: false, message: 'BAD_RACKET_ID' }, { status: 400 });
    }

    // days는 기존 메시지를 유지(아래에서 동일 체크)
    if (issues.some((i) => i.path?.[0] === 'days')) {
      return NextResponse.json({ message: '허용되지 않는 대여 기간' }, { status: 400 });
    }

    // 나머지 필수/형식 오류
    return NextResponse.json({ ok: false, message: '요청 값이 올바르지 않습니다.' }, { status: 400 });
  }

  body = parsed.data;

  const { racketId, days, payment, shipping, refundAccount, stringing, pointsToUse, servicePickupMethod } = body as z.infer<typeof RentalsCreateBodySchema>;

  const client = await clientPromise;
  const db = client.db();

  // Ensure stringing_applications indexes are correct before starting a transaction.
  // (Fixes legacy uniq_draft_per_order partial filter that can collide on orderId=null for rental drafts.)
  await ensureStringingTTLIndexes(db);
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  // 토큰이 깨져 있어도 500이 아니라 “비로그인 처리”로 내려가도록 방어
  let payload: any = null;
  try {
    payload = at ? verifyAccessToken(at) : null;
  } catch {
    payload = null;
  }
  const sub = typeof payload?.sub === 'string' && ObjectId.isValid(payload.sub) ? payload.sub : null;
  const userObjectId = sub ? new ObjectId(sub) : null;

  /**
   * 비회원 주문/대여 차단 (서버 1차 방어)
   * - UI(LoginGate)만 막으면 API를 직접 호출해서 생성될 수 있으므로,
   *   "비회원 주문 OFF" 모드에서는 여기서 바로 401로 차단.
   * - 서버 env(GUEST_ORDER_MODE)를 우선 사용하고,
   *   일부 환경에서 클라용 NEXT_PUBLIC_GUEST_ORDER_MODE만 존재할 수도 있어 방어적으로 함께 확인.
   */
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';

  if (!allowGuestCheckout && !userObjectId) {
    return NextResponse.json({ ok: false, message: 'LOGIN_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  // 은행 값 최종 방어(입금/환급)
  if (payment?.bank && !ALLOWED_BANKS.has(payment.bank as any)) {
    return NextResponse.json({ ok: false, message: 'INVALID_BANK' }, { status: 400 });
  }
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
  if (![7, 15, 30].includes(days)) {
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
  const rawQtyField = (racket as any).quantity;
  const hasStockQty = typeof rawQtyField === 'number' && Number.isFinite(rawQtyField);
  const baseQty = hasStockQty ? Math.max(0, Math.trunc(rawQtyField)) : racket.status === 'available' ? 1 : 0;
  const available = Math.max(0, baseQty - activeCount);

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

    // 스트링 교체 신청서(stringing_application) 연결용
    // - requested=true인 경우에만 채워짐
    let stringingApplicationId: string | null = null;

    // TransientTransactionError / NoSuchTransaction(251) 발생 시, 전체 트랜잭션을 짧게 재시도
    const isTransientTxnError = (e: any) => {
      const labels = Array.isArray(e?.errorLabels) ? e.errorLabels : [];
      return labels.includes('TransientTransactionError') || e?.code === 251;
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await session.startTransaction();

        const res = await db.collection('rental_orders').insertOne(doc, { session });
        insertedId = res.insertedId;
        const rentalIdStr = String(res.insertedId);

        // --- (2단계) 대여 기반 신청서 초안 자동 생성 + rental_orders에 연결 저장 ---
        if (stringingSnap?.requested) {
          const app = await createStringingApplicationFromRental(
            {
              _id: res.insertedId,
              userId: userObjectId ?? undefined,
              createdAt: now,
              servicePickupMethod: pickupMethod,
              shipping: shipping ?? undefined,
              stringing: stringingSnap ?? undefined,
              serviceFeeHint: (doc as any)?.amount?.stringingFee ?? 0,
            },
            { db, session },
          );
          stringingApplicationId = String(app._id);
          if (stringingApplicationId) {
            await db.collection('rental_orders').updateOne({ _id: res.insertedId }, { $set: { stringingApplicationId, updatedAt: new Date() } }, { session });
          }
        }

        if (pointsUsed > 0 && userObjectId) {
          await deductPoints(
            db,
            {
              userId: userObjectId,
              amount: pointsUsed,
              type: 'spend_on_order',
              refKey: `rental:${rentalIdStr}:spend`,
              reason: `라켓 대여 결제 포인트 사용 (대여ID: ${rentalIdStr})`,
            },
            { session },
          );
        }

        await session.commitTransaction();
        break; // 성공하면 루프 종료
      } catch (e: any) {
        // 트랜잭션 실패 시 abort 시도(이미 abort된 경우도 있으니 무시)
        await session.abortTransaction().catch(() => {});

        // transient면 짧게 대기 후 재시도
        if (attempt < 3 && isTransientTxnError(e)) {
          await new Promise((r) => setTimeout(r, 50 * attempt));
          continue;
        }
        throw e;
      }
    }

    if (!insertedId) throw new Error('RENTAL_INSERT_FAILED');
    return NextResponse.json({ ok: true, id: String(insertedId) });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
    // deductPoints가 던지는 대표 에러 메시지를 그대로 프론트로 전달
    // - INSUFFICIENT_POINTS
    // - POINTS_DEBT_EXISTS
    console.error('[POST /api/rentals] failed', {
      message: msg,
      code: e?.code,
      codeName: e?.codeName,
      errorLabels: e?.errorLabels,
      stack: e?.stack,
    });
    return NextResponse.json({ ok: false, message: msg, code: e?.code, codeName: e?.codeName, errorLabels: e?.errorLabels }, { status: 409 });
  } finally {
    await session.endSession();
  }
}
