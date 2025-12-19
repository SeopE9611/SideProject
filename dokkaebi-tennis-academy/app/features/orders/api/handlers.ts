import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import type { DBOrder } from '@/lib/types/order-db';
import { findUserSnapshot, fetchCombinedOrders } from './db';
import clientPromise from '@/lib/mongodb';
import { createStringingApplicationFromOrder } from '@/app/features/stringing-applications/api/create-from-order';
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

    // 클라이언트 쿠키에서 accessToken 가져오기
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    // 토큰이 있으면 검증 → payload에서 사용자 ID 추출
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;

    // 요청 바디 파싱
    const body = await req.json();
    type RawOrderItem = {
      productId: string;
      quantity: number;
      kind?: 'product' | 'racket';
    };
    const { items: rawItems, shippingInfo, totalPrice, shippingFee, guestInfo, serviceFee } = body;

    //  DB 커넥션 가져오기
    const client = await clientPromise;
    const db = client.db();
    type OrderDoc = Omit<DBOrder, '_id'> & {
      idemKey?: string; // (DBOrder에 없거나 타입이 이상하면 여기서 정의
      isStringServiceApplied?: boolean;
      stringingApplicationId?: string;
      servicePickupMethod?: any;
    };
    const ordersCol = db.collection<OrderDoc>('orders');

    // 유니크 인덱스(1회성, 여러 번 호출해도 안전)
    await ordersCol.createIndex({ idemKey: 1 }, { unique: true, sparse: true });

    // 동일 키로 이미 생성된 주문이면 바로 반환
    if (idemKey) {
      const dup = await ordersCol.findOne({ idemKey });
      if (dup) {
        return NextResponse.json({ success: true, orderId: String(dup._id) }, { status: 200 });
      }
    }

    // 비회원이면서 guestInfo가 없으면 잘못된 요청
    if (!userId && !guestInfo) {
      return NextResponse.json({ error: '게스트 주문 정보 누락' }, { status: 400 });
    }

    // 트랜잭션: 재고 차감 + 주문 생성 + (옵션) 신청서 생성까지 한 번에 커밋/롤백
    const session = client.startSession();
    let createdOrderId: ObjectId | null = null;
    let createdAppId: ObjectId | null = null;

    try {
      await session.withTransaction(async () => {
        // 1) 재고 차감 (세션 포함)
        for (const item of rawItems as RawOrderItem[]) {
          const kind = item.kind ?? 'product';
          const quantity = item.quantity;

          if (quantity <= 0) throw new HttpError(400, { error: '수량이 잘못되었습니다.' });

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

            //  현재 "대여 점유" 수량 계산: paid/out 상태는 반납 전이므로 판매 재고를 점유
            const activeRentalCount = await db.collection('rental_orders').countDocuments({ racketId, status: { $in: ['paid', 'out'] } }, { session });

            // 단품 라켓(<=1)은 status가 available일 때만 1개로 보고, 거기서 대여 점유를 뺌
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

            // (A) 단품(1점) 라켓
            if (!Number.isFinite(stockQty) || stockQty <= 1) {
              if (racket.status !== 'available') throw new HttpError(400, { error: '판매 가능한 라켓이 아닙니다.' });
              if (quantity !== 1) throw new HttpError(400, { error: '라켓은 1개만 구매할 수 있습니다.' });

              const r = await rackCol.updateOne({ _id: racketId, status: 'available' }, { $set: { status: 'sold', updatedAt: new Date().toISOString() } }, { session });
              if (r.matchedCount === 0)
                throw new HttpError(400, {
                  error: 'INSUFFICIENT_STOCK',
                  kind: 'racket',
                  productName: racketName,
                  currentStock: 0,
                  reason: 'CONCURRENT_UPDATE',
                });
              continue;
            }

            // (B) 재고형(다수 수량) 라켓
            if (quantity !== 1) throw new HttpError(400, { error: '라켓은 1개만 구매할 수 있습니다.' });

            const nowIso = new Date().toISOString();
            const updated = await rackCol.findOneAndUpdate(
              { _id: racketId, quantity: { $gte: activeRentalCount + 1 }, status: { $nin: ['inactive', '비노출'] } },
              [{ $set: { quantity: { $subtract: ['$quantity', 1] }, updatedAt: nowIso } }, { $set: { status: { $cond: [{ $lte: ['$quantity', 0] }, 'sold', 'available'] } } }] as any,
              { returnDocument: 'after', session } as any
            );

            // driver 버전에 따라 updated가 { value: doc } 이거나 doc 자체일 수 있어서 둘 다 대응
            const updatedDoc = updated && typeof updated === 'object' && 'value' in (updated as any) ? (updated as any).value : updated;

            if (!updatedDoc)
              throw new HttpError(400, {
                error: 'INSUFFICIENT_STOCK',
                kind: 'racket',
                productName: racketName,
                currentStock: 0,
                reason: 'CONCURRENT_UPDATE',
              });

            continue;
          }

          throw new HttpError(400, { error: 'INVALID_ITEM_KIND' });
        }

        // 2) 스냅샷 구성(세션 포함)
        const itemsWithSnapshot = await Promise.all(
          (rawItems as RawOrderItem[]).map(async (it) => {
            const kind = it.kind ?? 'product';
            const quantity = it.quantity;

            if (kind === 'product') {
              const oid = new ObjectId(it.productId);
              const prod = await db.collection('products').findOne({ _id: oid }, { session });
              return {
                productId: oid,
                name: prod?.name ?? '알 수 없는 상품',
                price: prod?.price ?? 0,
                imageUrl: (prod as any)?.imageUrl ?? null,
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
              price: racket?.price ?? 0,
              imageUrl: racket?.images?.[0] ?? null,
              quantity,
              kind: 'racket' as const,
            };
          })
        );

        const paymentInfo = { method: '무통장입금', bank: body.paymentInfo?.bank || 'shinhan' };

        const order: DBOrder = {
          items: itemsWithSnapshot,
          shippingInfo,
          totalPrice,
          shippingFee,
          guestInfo: guestInfo || null,
          paymentInfo,
          createdAt: new Date(),
          status: '대기중',
          serviceFee: typeof serviceFee === 'number' ? serviceFee : 0,
        };
        (order as any).servicePickupMethod = body.servicePickupMethod;
        if (idemKey) (order as any).idemKey = idemKey; // idemKey 없으면 필드 자체를 안 넣음(sparse unique 안전)

        if (userId) {
          order.userId = new ObjectId(userId);
          const snapshot = await findUserSnapshot(userId);
          if (snapshot) order.userSnapshot = snapshot;
        }

        // 3) 주문 insert (세션 포함)
        const inserted = await ordersCol.insertOne(order as any, { session });
        createdOrderId = inserted.insertedId as ObjectId;

        // 4) 주문 기반 신청서 자동 생성(옵션) — 같은 세션으로 묶음
        if (shippingInfo?.withStringService === true) {
          const app = await createStringingApplicationFromOrder(
            {
              _id: createdOrderId,
              userId: (order as any).userId,
              shippingInfo: order.shippingInfo as any,
              createdAt: order.createdAt,
              servicePickupMethod: (order as any).servicePickupMethod,
            } as any,
            { db, session }
          );

          createdAppId = app?._id ?? null;

          if (createdAppId) {
            await ordersCol.updateOne({ _id: createdOrderId }, { $set: { isStringServiceApplied: true, stringingApplicationId: String(createdAppId) } }, { session });
          }
        }
      });
    } finally {
      await session.endSession();
    }

    //  주문 스냅샷
    const itemsWithSnapshot = await Promise.all(
      (rawItems as RawOrderItem[]).map(async (it) => {
        const kind = it.kind ?? 'product';
        const quantity = it.quantity;

        // product 스냅샷
        if (kind === 'product') {
          const oid = new ObjectId(it.productId);
          const prod = await db.collection('products').findOne({ _id: oid });

          return {
            productId: oid,
            name: prod?.name ?? '알 수 없는 상품',
            price: prod?.price ?? 0,
            imageUrl: (prod as any)?.imageUrl ?? null,
            quantity,
            kind: 'product' as const,
          };
        }

        // racket 스냅샷
        const rid = new ObjectId(it.productId);
        const racket = await db.collection('used_rackets').findOne({ _id: rid });

        const racketName = racket ? `${racket.brand} ${racket.model}`.trim() : '알 수 없는 라켓';

        return {
          productId: rid,
          name: racketName,
          price: racket?.price ?? 0,
          imageUrl: racket?.images?.[0] ?? null,
          quantity,
          kind: 'racket' as const,
        };
      })
    );

    // 결제 정보 구성 (무통장 입금 + 선택된 은행)
    const paymentInfo = {
      method: '무통장입금',
      bank: body.paymentInfo?.bank || 'shinhan',
    };

    // 비회원이면서 guestInfo가 없으면 잘못된 요청
    if (!userId && !guestInfo) {
      return NextResponse.json({ error: '게스트 주문 정보 누락' }, { status: 400 });
    }

    // 주문 객체 생성
    const order: DBOrder = {
      items: itemsWithSnapshot,
      shippingInfo,
      totalPrice,
      shippingFee,
      guestInfo: guestInfo || null,
      paymentInfo,
      createdAt: new Date(),
      status: '대기중',
      idemKey,
      serviceFee: typeof serviceFee === 'number' ? serviceFee : 0,
    };
    (order as any).servicePickupMethod = body.servicePickupMethod;

    // 회원일 경우 userId, userSnapshot 추가
    if (userId) {
      order.userId = new ObjectId(userId);
      const snapshot = await findUserSnapshot(userId);
      if (snapshot) {
        order.userSnapshot = snapshot;
      }
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
  // 쿼리에서 page, limit 파싱
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  // 통합된 주문 목록 불러오기
  const combined = await fetchCombinedOrders();

  // 서버 사이드 페이징
  const paged = combined.slice(skip, skip + limit);
  const total = combined.length;

  // 응답 반환
  return NextResponse.json({ items: paged, total });
}
