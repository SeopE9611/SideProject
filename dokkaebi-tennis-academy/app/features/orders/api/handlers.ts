import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import type { DBOrder } from '@/lib/types/order-db';
import { findUserSnapshot, fetchCombinedOrders } from './db';
import clientPromise from '@/lib/mongodb';
import { createStringingApplicationFromOrder } from '@/app/features/stringing-applications/api/create-from-order';
import { deductPoints } from '@/lib/points.service';
import { getShippingBadge } from '@/lib/badge-style';
import { z } from 'zod';

/**
 * 서버 최종 유효성 검사 스키마(주문 생성)
 * - 목적:
 *   1) req.json() 파싱 실패/타입 깨짐 요청을 400으로 정리
 *   2) ObjectId 변환(new ObjectId) 이전에 유효성 검사로 500 방지
 *   3) shippingInfo의 최소 규칙(배송 주소 조건부 필수 등) 강제
 *
 * 주의:
 * - 기존 로직을 바꾸지 않기 위해, 필요한 최소 필드만 강제하고 나머지는 passthrough로 허용.
 * - (일반 체크아웃) shippingInfo.deliveryMethod 사용
 * - (라켓 구매 체크아웃) shippingInfo.shippingMethod 사용
 */

// 숫자/문자 혼용으로 들어오는 입력을 안전하게 문자열로 정규화
const toTrimmedString = (v: unknown) => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

// 연락처: 숫자만 남기기 (클라에서는 이미 digits지만, 서버에서도 방어)
const toPhoneDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, '');

const OrderItemSchema = z.object({
  // createOrder 내부에서 new ObjectId(item.productId)를 호출하므로, 여기서 먼저 검증해 500을 방지합니다.
  productId: z
    .string()
    .trim()
    .min(1)
    .refine((s) => ObjectId.isValid(s), { message: 'INVALID_PRODUCT_ID' }),
  quantity: z.coerce.number().int().positive(),
  kind: z.enum(['product', 'racket']).optional(),
});

const GuestInfoSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    phone: z
      .preprocess(toPhoneDigits, z.string().min(8).max(13))
      // 너무 강하게 막으면 운영 중 예외 케이스가 생길 수 있어, 길이만 최소 방어합니다.
      .optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => v.toLowerCase()),
  })
  .passthrough();

const ShippingInfoSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    phone: z.preprocess(toPhoneDigits, z.string().min(8).max(13)),

    // 주소 계열은 "택배/발송"일 때만 필수(조건부). 방문이면 빈 문자열도 허용됩니다.
    address: z.preprocess(toTrimmedString, z.string()).optional(),
    addressDetail: z.preprocess(toTrimmedString, z.string()).optional(),
    postalCode: z.preprocess(toTrimmedString, z.string()).optional(),

    depositor: z.string().trim().min(2).max(50),
    deliveryRequest: z.preprocess(toTrimmedString, z.string()).optional(),

    // 일반 체크아웃: deliveryMethod 사용 (택배수령/방문수령)
    deliveryMethod: z.enum(['택배수령', '방문수령']).optional(),

    // 라켓 구매 체크아웃: shippingMethod 사용 (courier/visit)
    shippingMethod: z.enum(['courier', 'visit']).optional(),

    // 교체 서비스 여부(일반 체크아웃에서만 내려옴). 없으면 false 취급.
    withStringService: z.coerce.boolean().optional(),
  })
  .passthrough()
  .superRefine((v, ctx) => {
    // 둘 중 하나는 반드시 존재(현재 프로젝트의 두 checkout 흐름 모두 해당)
    if (!v.deliveryMethod && !v.shippingMethod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deliveryMethod'], message: 'DELIVERY_METHOD_REQUIRED' });
    }

    // 택배/발송이면 주소/우편번호 최소 방어
    const needsAddress = v.deliveryMethod === '택배수령' || v.shippingMethod === 'courier';
    if (needsAddress) {
      const postal = (v.postalCode ?? '').trim();
      const addr = (v.address ?? '').trim();

      // 우편번호 5자리 (CheckoutButton과 동일 기준)
      if (!/^\d{5}$/.test(postal)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['postalCode'], message: 'INVALID_POSTAL_CODE' });
      }
      if (!addr) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['address'], message: 'ADDRESS_REQUIRED' });
      }
      // addressDetail은 라켓 구매 체크아웃에서 선택값이므로 서버에서 강제하지 않습니다.
    }
  });

const CreateOrderBodySchema = z
  .object({
    items: z.array(OrderItemSchema).min(1),
    shippingInfo: ShippingInfoSchema,

    // 비회원 주문인 경우에만 createOrder에서 추가로 필수 체크합니다(기존 로직 유지)
    guestInfo: GuestInfoSchema.optional(),

    // 참고/로그용 필드들(서버는 신뢰하지 않고 재계산)
    totalPrice: z.any().optional(),
    shippingFee: z.any().optional(),
    serviceFee: z.any().optional(),

    // 포인트 사용(서버에서 100단위 보정/클램프는 기존 로직 그대로 사용)
    pointsToUse: z.coerce.number().optional(),

    paymentInfo: z
      .object({
        bank: z.preprocess(toTrimmedString, z.string()).optional(),
      })
      .passthrough()
      .optional(),

    // 기타(추가 필드들은 유지하되, 스키마가 걸러내지 않도록 passthrough)
    servicePickupMethod: z.any().optional(),
    isStringServiceApplied: z.any().optional(),
  })
  .passthrough();

// 주문 생성 핸들러
export async function createOrder(req: Request): Promise<Response> {
  try {
    const idemKeyRaw = req.headers.get('Idempotency-Key');
    const idemKey = idemKeyRaw && idemKeyRaw.trim() ? idemKeyRaw : undefined;

    class HttpError extends Error {
      status: number;
      body: any;
      constructor(status: number, body: any) {
        super('HttpError');
        this.status = status;
        this.body = body;
      }
    }

    // 쿠키에서 accessToken → userId 추출
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;

    // 요청 바디 파싱(JSON 깨짐 방어)
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: '요청 본문(JSON)이 올바르지 않습니다.' }, { status: 400 });
    }

    // 서버 최종 스키마 검증
    const parsed = CreateOrderBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      // 기존 UX에 맞춰 "무엇이 문제인지"를 가능한 범위에서 분기해줍니다.
      const issues = parsed.error.issues ?? [];

      // 아이템 관련 (빈 배열/형식/ID 등)
      if (issues.some((i) => i.path?.[0] === 'items' && i.message === 'INVALID_PRODUCT_ID')) {
        return NextResponse.json({ error: '잘못된 상품 ID 입니다.' }, { status: 400 });
      }
      if (issues.some((i) => i.path?.[0] === 'items')) {
        return NextResponse.json({ error: '주문 상품이 비어있습니다.' }, { status: 400 });
      }

      // 배송 정보 관련
      if (issues.some((i) => i.path?.[0] === 'shippingInfo')) {
        return NextResponse.json({ error: '배송 정보가 누락되었거나 올바르지 않습니다.' }, { status: 400 });
      }

      // 나머지(포인트/게스트 정보 등) - 기본 메시지
      return NextResponse.json({ error: '요청 값이 올바르지 않습니다.' }, { status: 400 });
    }

    const body = parsed.data;
    type RawOrderItem = z.infer<typeof OrderItemSchema>;

    // - 서버가 최종 규칙을 강제(클라 입력은 참고용)
    // - 정책: 100P 단위로만 사용 가능 (UI와 동일)
    const POINT_UNIT = 100;
    const requestedPointsToUse = Math.max(0, Math.floor(Number(body?.pointsToUse ?? 0) || 0));
    const normalizedRequestedPointsToUse = Math.floor(requestedPointsToUse / POINT_UNIT) * POINT_UNIT;

    // 클라 금액은 절대 신뢰하지 않음(참고 로그용만)
    const { items: rawItems, shippingInfo, guestInfo } = body;
    const clientTotalPrice = body?.totalPrice;
    const clientShippingFee = body?.shippingFee;
    const clientServiceFee = body?.serviceFee;

    // 최소 방어
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: '주문 상품이 비어있습니다.' }, { status: 400 });
    }
    if (!shippingInfo) {
      return NextResponse.json({ error: '배송 정보가 누락되었습니다.' }, { status: 400 });
    }
    if (!userId && !guestInfo) {
      return NextResponse.json({ error: '게스트 주문 정보 누락' }, { status: 400 });
    }

    /**
     * 배송 방식 정규화(중요)
     * - 일반 체크아웃: shippingInfo.deliveryMethod = '택배수령' | '방문수령'
     * - 라켓 구매 체크아웃: shippingInfo.shippingMethod = 'courier' | 'visit'
     *
     * 현재 서버 내부 로직(배송비 계산, getShippingBadge 등)은 deliveryMethod를 기준으로 동작하는 구간이 있으므로,
     * 라켓 구매 흐름도 deliveryMethod로 매핑해 “서버 내부 기준”을 하나로 통일.
     *
     * 효과:
     * - 라켓 구매 + visit 인데 배송비가 0원이 아니게 계산되는 케이스 방지
     * - 주문 목록/상세에서 배송 라벨(뱃지/필터)이 일관되게 표시될 확률 증가
     */
    if (shippingInfo && !(shippingInfo as any).deliveryMethod && (shippingInfo as any).shippingMethod) {
      const sm = (shippingInfo as any).shippingMethod;
      if (sm === 'visit') (shippingInfo as any).deliveryMethod = '방문수령';
      else if (sm === 'courier') (shippingInfo as any).deliveryMethod = '택배수령';
    }

    // DB
    const client = await clientPromise;
    const db = client.db();

    type OrderDoc = Omit<DBOrder, '_id'> & {
      idemKey?: string;
      isStringServiceApplied?: boolean;
      stringingApplicationId?: string;
      servicePickupMethod?: any;
    };

    const ordersCol = db.collection<OrderDoc>('orders');

    // idemKey 유니크 인덱스(여러 번 호출해도 안전)
    await ordersCol.createIndex({ idemKey: 1 }, { unique: true, sparse: true });

    // idemKey로 이미 생성된 주문이면 반환
    if (idemKey) {
      const dup = await ordersCol.findOne({ idemKey });
      if (dup) {
        return NextResponse.json({ success: true, orderId: String(dup._id) }, { status: 200 });
      }
    }

    // 트랜잭션: 재고 차감 + 주문 생성 + (옵션) 신청서 생성
    const session = client.startSession();
    let createdOrderId: ObjectId | null = null;

    try {
      await session.withTransaction(async () => {
        // 1) 재고 차감(세션 포함)
        for (const item of rawItems as RawOrderItem[]) {
          const kind = item.kind ?? 'product';
          const quantity = Number(item.quantity ?? 0);

          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new HttpError(400, { error: '수량이 잘못되었습니다.' });
          }

          if (kind === 'product') {
            const productId = new ObjectId(item.productId);
            const product = await db.collection('products').findOne({ _id: productId }, { session });
            if (!product) throw new HttpError(404, { error: '상품을 찾을 수 없습니다.' });

            const currentStock = Number(product?.inventory?.stock ?? 0);
            if (currentStock < quantity) {
              throw new HttpError(400, {
                error: 'INSUFFICIENT_STOCK',
                productName: product.name,
                currentStock,
              });
            }

            await db.collection('products').updateOne({ _id: productId }, { $inc: { 'inventory.stock': -quantity, sold: quantity } }, { session });
            continue;
          }

          if (kind === 'racket') {
            const racketId = new ObjectId(item.productId);
            const rackCol = db.collection('used_rackets');

            const racket = await rackCol.findOne({ _id: racketId }, { projection: { status: 1, quantity: 1, brand: 1, model: 1 }, session });
            if (!racket) throw new HttpError(400, { error: '판매 가능한 라켓이 아닙니다.' });

            const stockQty = Number(racket.quantity ?? 1);
            const racketName = `${(racket as any).brand ?? ''} ${(racket as any).model ?? ''}`.trim() || '중고 라켓';

            // 대여 점유 수량
            const activeRentalCount = await db.collection('rental_orders').countDocuments({ racketId, status: { $in: ['paid', 'out'] } }, { session });

            const baseQty = !Number.isFinite(stockQty) || stockQty <= 1 ? (racket.status === 'available' ? 1 : 0) : stockQty;

            const sellableQty = baseQty - activeRentalCount;

            if (sellableQty < 1) {
              const reason = activeRentalCount > 0 ? 'RENTAL_RESERVED' : 'OUT_OF_STOCK';
              throw new HttpError(400, {
                error: 'INSUFFICIENT_STOCK',
                kind: 'racket',
                productName: racketName,
                currentStock: sellableQty,
                baseQty,
                reason,
                activeRentalCount,
              });
            }

            // (A) 단품(1점)
            if (!Number.isFinite(stockQty) || stockQty <= 1) {
              if (racket.status !== 'available') throw new HttpError(400, { error: '판매 가능한 라켓이 아닙니다.' });
              if (quantity !== 1) throw new HttpError(400, { error: '라켓은 1개만 구매할 수 있습니다.' });

              const r = await rackCol.updateOne({ _id: racketId, status: 'available' }, { $set: { status: 'sold', updatedAt: new Date().toISOString() } }, { session });

              if (r.matchedCount === 0) {
                throw new HttpError(400, {
                  error: 'INSUFFICIENT_STOCK',
                  kind: 'racket',
                  productName: racketName,
                  currentStock: 0,
                  reason: 'CONCURRENT_UPDATE',
                });
              }
              continue;
            }

            // (B) 재고형(다수 수량)
            if (quantity !== 1) throw new HttpError(400, { error: '라켓은 1개만 구매할 수 있습니다.' });

            const nowIso = new Date().toISOString();
            const updated = await rackCol.findOneAndUpdate(
              { _id: racketId, quantity: { $gte: activeRentalCount + 1 }, status: { $nin: ['inactive', '비노출'] } },
              [{ $set: { quantity: { $subtract: ['$quantity', 1] }, updatedAt: nowIso } }, { $set: { status: { $cond: [{ $lte: ['$quantity', 0] }, 'sold', 'available'] } } }] as any,
              { returnDocument: 'after', session } as any,
            );

            const updatedDoc = updated && typeof updated === 'object' && 'value' in (updated as any) ? (updated as any).value : updated;

            if (!updatedDoc) {
              throw new HttpError(400, {
                error: 'INSUFFICIENT_STOCK',
                kind: 'racket',
                productName: racketName,
                currentStock: 0,
                reason: 'CONCURRENT_UPDATE',
              });
            }

            continue;
          }

          throw new HttpError(400, { error: 'INVALID_ITEM_KIND' });
        }

        // 스냅샷 구성(세션 포함)
        const itemsWithSnapshot = await Promise.all(
          (rawItems as RawOrderItem[]).map(async (it) => {
            const kind = it.kind ?? 'product';
            const quantity = Number(it.quantity ?? 0);

            if (kind === 'product') {
              const oid = new ObjectId(it.productId);
              const prod = await db.collection('products').findOne({ _id: oid }, { session });

              return {
                productId: oid,
                name: prod?.name ?? '알 수 없는 상품',
                brand: prod?.brand,
                category: prod?.category,
                price: Number(prod?.price ?? 0),

                // 서비스비 근거 데이터(DB 기준)
                mountingFee: Number.isFinite(Number((prod as any)?.mountingFee)) ? Number((prod as any).mountingFee) : 0,

                imageUrl: prod?.images?.[0],
                quantity,
                kind: 'product' as const,
              };
            }

            const rid = new ObjectId(it.productId);
            const racket = await db.collection('used_rackets').findOne({ _id: rid }, { session });
            const racketName = racket ? `${racket.brand} ${racket.model}`.trim() : '알 수 없는 라켓';

            return {
              productId: rid,
              name: racketName,
              price: Number(racket?.price ?? 0),
              imageUrl: (racket as any)?.images?.[0] ?? null,
              quantity,
              kind: 'racket' as const,
            };
          }),
        );

        // 서버에서 금액 재계산(조작 무력화)
        const computedSubtotal = itemsWithSnapshot.reduce((sum, it) => {
          return sum + (Number(it.price) || 0) * (Number(it.quantity) || 0);
        }, 0);

        const computedServiceFee = shippingInfo?.withStringService
          ? itemsWithSnapshot.reduce((sum, it) => {
              if (it.kind !== 'product') return sum;
              const mf = Number((it as any).mountingFee || 0);
              if (!Number.isFinite(mf) || mf <= 0) return sum;
              return sum + mf * (Number(it.quantity) || 0);
            }, 0)
          : 0;

        const computedShippingFee = (() => {
          if (computedSubtotal === 0) return 0;
          if (shippingInfo?.deliveryMethod === '방문수령') return 0;
          return computedSubtotal >= 30000 ? 0 : 3000;
        })();

        const computedTotalPrice = computedSubtotal + computedServiceFee + computedShippingFee;

        // 포인트 사용(회원만) — 서버가 최종 확정
        // 정책: 배송비는 포인트 적용 제외(= 상품금액 + 서비스비까지만 차감 가능)
        const maxPointsByPolicy = Math.max(0, computedTotalPrice - computedShippingFee); // = computedSubtotal + computedServiceFee
        let pointsToUse = 0;

        if (userId && normalizedRequestedPointsToUse > 0 && maxPointsByPolicy > 0) {
          const userOid = new ObjectId(userId);
          const u = await db.collection('users').findOne({ _id: userOid }, { projection: { pointsBalance: 1, pointsDebt: 1 }, session } as any);

          const balanceRaw = Number((u as any)?.pointsBalance ?? 0);
          const debtRaw = Number((u as any)?.pointsDebt ?? 0);

          const balance = Number.isFinite(balanceRaw) && balanceRaw > 0 ? Math.floor(balanceRaw) : 0;
          const debt = Number.isFinite(debtRaw) && debtRaw > 0 ? Math.floor(debtRaw) : 0;

          // 실제 사용 가능 포인트 = balance - debt (0 미만 방지)
          const available = Math.max(0, balance - debt);

          // 정책(배송비 제외)과 available 둘 다 만족하는 범위로 클램프
          const maxPointsByBalanceAndPolicy = Math.min(available, maxPointsByPolicy);

          // 요청값(100P 단위 정규화)도 결국 서버가 최종 확정
          pointsToUse = Math.min(normalizedRequestedPointsToUse, maxPointsByBalanceAndPolicy);
        }

        const payableTotalPrice = Math.max(0, computedTotalPrice - pointsToUse);
        // 결제 은행(Checkout에서 paymentInfo.bank로 내려옴)
        const bankRaw = body?.paymentInfo?.bank;
        const bank = typeof bankRaw === 'string' && bankRaw.trim() !== '' ? bankRaw.trim() : undefined;

        // 주문 문서 생성(저장 값은 서버 계산값만)
        const order: any = {
          items: itemsWithSnapshot,
          shippingInfo,
          guestInfo: userId ? null : guestInfo || null,

          originalTotalPrice: computedTotalPrice,
          pointsUsed: pointsToUse,
          totalPrice: payableTotalPrice,
          shippingFee: computedShippingFee,
          serviceFee: computedServiceFee,

          status: '대기중',
          createdAt: new Date(),
          updatedAt: new Date(),

          paymentInfo: {
            method: '무통장 입금',
            status: 'pending',
            originalTotal: computedTotalPrice,
            pointsUsed: pointsToUse,
            // total: computedTotalPrice,
            total: payableTotalPrice,
            shippingFee: computedShippingFee,
            serviceFee: computedServiceFee,
            bank,
            createdAt: new Date(),
          },

          history: [{ status: '대기중', date: new Date(), description: '주문 생성' }],
        };

        // 옵션 값들
        order.servicePickupMethod = body.servicePickupMethod;
        if (idemKey) order.idemKey = idemKey;

        // 회원이면 snapshot 추가
        if (userId) {
          order.userId = new ObjectId(userId);
          const snapshot = await findUserSnapshot(userId);
          if (snapshot) order.userSnapshot = snapshot;
        }

        // insert
        const inserted = await ordersCol.insertOne(order, { session });
        createdOrderId = inserted.insertedId as ObjectId;

        // 포인트 차감(회원 + pointsToUse>0 일 때만)
        if (userId && pointsToUse > 0) {
          try {
            await deductPoints(
              db,
              {
                userId: new ObjectId(userId),
                amount: pointsToUse,
                type: 'spend_on_order',
                status: 'confirmed',
                refKey: `order:${String(createdOrderId)}:spend`,
                ref: { orderId: createdOrderId },
                reason: '주문 포인트 사용',
              },
              { session },
            );
          } catch (e: any) {
            // (1) 중복 차감 시도(재시도/중복 호출)면 이미 반영된 것으로 보고 통과
            if (e?.code === 11000) {
              // noop
            } else if (e?.code === 'INSUFFICIENT_POINTS') {
              throw new HttpError(400, { error: 'INSUFFICIENT_POINTS', message: '포인트 잔액이 부족합니다.' });
            } else {
              throw e;
            }
          }
        }
        // 주문 기반 신청서 자동 생성(옵션)
        if (shippingInfo?.withStringService === true) {
          const app = await createStringingApplicationFromOrder(
            {
              _id: createdOrderId,
              userId: order.userId,
              shippingInfo: order.shippingInfo,
              createdAt: order.createdAt,
              servicePickupMethod: order.servicePickupMethod,
            } as any,
            { db, session },
          );

          const createdAppId = app?._id ?? null;

          if (createdAppId) {
            await ordersCol.updateOne({ _id: createdOrderId }, { $set: { isStringServiceApplied: true, stringingApplicationId: String(createdAppId) } }, { session });
          }
        }

        // 조작 탐지 로그
        // console.log('[createOrder] client fees', { clientTotalPrice, clientShippingFee, clientServiceFee });
        // console.log('[createOrder] computed fees', { computedSubtotal, computedShippingFee, computedServiceFee, computedTotalPrice });
      });
    } finally {
      await session.endSession();
    }

    if (!createdOrderId) {
      return NextResponse.json({ success: false, error: '주문 생성 실패(트랜잭션 결과 누락)' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId: String(createdOrderId) }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && (error as any).status && (error as any).body) {
      return NextResponse.json((error as any).body, { status: (error as any).status });
    }
    console.error('주문 POST 에러:', error);
    return NextResponse.json({ success: false, error: '주문 생성 중 오류 발생' }, { status: 500 });
  }
}

// 관리자 주문 목록 GET 핸들러
export async function getOrders(req: NextRequest): Promise<Response> {
  // 인증 토큰 확인
  const token = req.cookies.get('accessToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyAccessToken(token);
  const sub = (payload as any)?.sub;
  if (!sub || typeof sub !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 토큰이 비정상/오염된 경우 new ObjectId(sub)에서 500이 나지 않도록 방어
  if (!ObjectId.isValid(sub)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 사용자 role 확인 (admin 여부 판단)
  const client = await clientPromise;
  const db = client.db();
  const userIdObj = new ObjectId(sub);
  const me = await db.collection('users').findOne({ _id: userIdObj }, { projection: { role: 1 } });
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin = me.role === 'admin';

  // 쿼리에서 page, limit 파싱
  const sp = req.nextUrl.searchParams;
  const pageRaw = parseInt(sp.get('page') || '1', 10);
  const limitRaw = parseInt(sp.get('limit') || '10', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  /**
   * limit 클램프(상한)
   * - fetchCombinedOrders가 전체를 메모리로 들고 와서 필터/슬라이스 하는 구조라
   *   과도한 limit 요청은 응답/메모리 부담이 됩니다. (서버 안정성 목적)
   */
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 10;
  const skip = (page - 1) * limit;

  // 클라이언트가 보내는 검색/필터 파라미터들
  const q = (sp.get('q') || '').trim().toLowerCase();
  const status = sp.get('status') || 'all';
  const type = sp.get('type') || 'all';
  const payment = sp.get('payment') || 'all';
  const shipping = sp.get('shipping') || 'all';
  const customerType = sp.get('customerType') || 'all'; // member | guest | all
  const dateYmd = sp.get('date') || ''; // "YYYY-MM-DD" (OrdersClient에서 KST로 보냄)

  // KST 기준 YYYY-MM-DD 변환 (클라 DateFilter와 동일 기준 맞추기)
  const toKstYmd = (input: any) => {
    const d = new Date(input);
    if (!Number.isFinite(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // e.g. "2025-12-31"
  };

  const safeLower = (v: any) => (typeof v === 'string' ? v.toLowerCase() : '');

  // 통합된 주문 목록 불러오기
  const combined = await fetchCombinedOrders({ userId: userIdObj, isAdmin });

  // 1) 필터 먼저 적용 (전체 기준)
  const filtered = combined.filter((order: any) => {
    // --- 검색(q): id, 고객명, 이메일 ---
    const idStr = safeLower(order?.id ?? order?._id);
    const nameStr = safeLower(order?.customer?.name);
    const emailStr = safeLower(order?.customer?.email);
    const searchMatch = !q || idStr.includes(q) || nameStr.includes(q) || emailStr.includes(q);

    // --- 상태/유형/결제 ---
    const statusMatch = status === 'all' || order?.status === status;
    const typeMatch = type === 'all' || order?.type === type;
    const paymentMatch = payment === 'all' || order?.paymentStatus === payment;

    // --- 고객유형(member/guest) ---
    const customerTypeMatch = customerType === 'all' || (customerType === 'member' && !!order?.userId) || (customerType === 'guest' && !order?.userId);

    // --- 운송장(shipping): OrdersClient의 기준(getShippingBadge.label)과 동일하게 ---
    const shippingLabel = getShippingBadge(order).label;
    const shippingMatch = shipping === 'all' || shippingLabel === shipping;

    // --- 날짜(date): KST YYYY-MM-DD 기준 일치 여부 ---
    const orderYmd = dateYmd ? toKstYmd(order?.date ?? order?.createdAt) : '';
    const dateMatch = !dateYmd || (orderYmd && orderYmd === dateYmd);

    return searchMatch && statusMatch && typeMatch && paymentMatch && customerTypeMatch && shippingMatch && dateMatch;
  });

  // 2) 필터된 결과에 대해 페이징
  const paged = filtered.slice(skip, skip + limit);
  const total = filtered.length;
  // 응답 반환

  return NextResponse.json({ items: paged, total });
}
