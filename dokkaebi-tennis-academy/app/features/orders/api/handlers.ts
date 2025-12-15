import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import type { DBOrder } from '@/lib/types/order-db';
import { insertOrder, findUserSnapshot } from './db';
import { fetchCombinedOrders } from './db';
import clientPromise from '@/lib/mongodb';
import { createStringingApplicationFromOrder } from '@/app/features/stringing-applications/api/create-from-order';
// 주문 생성 핸들러
export async function createOrder(req: Request): Promise<Response> {
  try {
    const idemKey = req.headers.get('Idempotency-Key') || null;

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
    const { items: rawItems, shippingInfo, totalPrice, shippingFee, guestInfo } = body;

    //  DB 커넥션 가져오기
    const client = await clientPromise;
    const db = client.db();
    const ordersCol = db.collection('orders');

    // 유니크 인덱스(1회성, 여러 번 호출해도 안전)
    await ordersCol.createIndex({ idemKey: 1 }, { unique: true, sparse: true });

    // 동일 키로 이미 생성된 주문이면 바로 반환
    if (idemKey) {
      const dup = await ordersCol.findOne({ idemKey });
      if (dup) {
        return NextResponse.json({ success: true, orderId: dup._id }, { status: 200 });
      }
    }

    for (const item of rawItems as RawOrderItem[]) {
      const kind = item.kind ?? 'product';
      const quantity = item.quantity;

      if (quantity <= 0) {
        return NextResponse.json({ error: '수량이 잘못되었습니다.' }, { status: 400 });
      }

      // 일반 상품 재고 차감
      if (kind === 'product') {
        const productId = new ObjectId(item.productId);

        const product = await db.collection('products').findOne({ _id: productId });
        if (!product) {
          return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
        }

        if (product.inventory.stock < quantity) {
          return NextResponse.json(
            {
              error: 'INSUFFICIENT_STOCK',
              productName: product.name,
              currentStock: product.inventory.stock,
            },
            { status: 400 }
          );
        }

        await db.collection('products').updateOne(
          { _id: productId },
          {
            $inc: {
              'inventory.stock': -quantity,
              sold: quantity,
            },
          }
        );

        continue;
      }

      // 중고 라켓 판매 처리 (used_rackets)
      if (kind === 'racket') {
        const racketId = new ObjectId(item.productId);

        // used_rackets 스키마: status/price/images/brand/model
        const racket = await db.collection('used_rackets').findOne({ _id: racketId });
        if (!racket) {
          return NextResponse.json({ error: '라켓을 찾을 수 없습니다.' }, { status: 404 });
        }

        // 판매 가능 상태만 허용
        if (racket.status !== 'available') {
          return NextResponse.json({ error: '판매 가능한 라켓이 아닙니다.' }, { status: 400 });
        }

        // 중고 라켓은 보통 1점 상품이므로 quantity는 1만 허용(안전)
        if (quantity !== 1) {
          return NextResponse.json({ error: '라켓은 1개만 구매할 수 있습니다.' }, { status: 400 });
        }

        // 판매 완료 처리: status를 sold로 변경
        await db.collection('used_rackets').updateOne({ _id: racketId }, { $set: { status: 'sold', updatedAt: new Date().toISOString() } });

        continue;
      }

      return NextResponse.json({ error: 'INVALID_ITEM_KIND' }, { status: 400 });
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
      // isStringServiceApplied: !!body.isStringServiceApplied, // 프론트 신호 보존
      idemKey,
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

    // DB에 주문 저장
    const result = await insertOrder(order);

    // // "함께 진행" 요청이면 신청서 자동 생성
    // if (order.isStringServiceApplied === true) {
    //   const client = await clientPromise;
    //   const db = client.db();

    //   // 방금 저장한 order 문서 재조회(신뢰할 id로)
    //   const saved = await db.collection('orders').findOne({ _id: result.insertedId });

    //   if (saved) {
    //     // 주문 → 신청서 변환 유틸 호출(멱등)
    //     await createStringingApplicationFromOrder(saved as any);
    //   }
    // }
    // === 자동 생성은 하지 않음.===
    // 체크박스는 shippingInfo.withStringService 로만 보존하고,
    // 실제 신청은 마이페이지/주문 상세/주문 목록 CTA를 통해 사용자가 진행.

    // 성공 응답 반환
    return NextResponse.json({ success: true, orderId: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
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
