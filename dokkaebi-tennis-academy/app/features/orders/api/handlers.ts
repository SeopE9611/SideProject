import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import type { DBOrder } from '@/lib/types/order-db';
import { findUserSnapshot, fetchCombinedOrders } from './db';
import clientPromise from '@/lib/mongodb';
import { createStringingApplicationFromOrder } from '@/app/features/stringing-applications/api/create-from-order';
import { deductPoints } from '@/lib/points.service';
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

    // 요청 바디 파싱
    const body = await req.json();
    type RawOrderItem = {
      productId: string;
      quantity: number;
      kind?: 'product' | 'racket';
    };

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
              { returnDocument: 'after', session } as any
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
          })
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
              { session }
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
            { db, session }
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
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  // 통합된 주문 목록 불러오기
  const combined = await fetchCombinedOrders({ userId: userIdObj, isAdmin });
  // 서버 사이드 페이징
  const paged = combined.slice(skip, skip + limit);
  const total = combined.length;

  // 응답 반환
  return NextResponse.json({ items: paged, total });
}
