import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import type { DBOrder } from '@/lib/types/order-db';
import { insertOrder, findUserSnapshot } from './db';
import { fetchCombinedOrders } from './db';
import clientPromise from '@/lib/mongodb';
// 주문 생성 핸들러
export async function createOrder(req: Request): Promise<Response> {
  try {
    // 클라이언트 쿠키에서 accessToken 가져오기
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    // 토큰이 있으면 검증 → payload에서 사용자 ID 추출
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;

    // 요청 바디 파싱
    const body = await req.json();
    const { items, shippingInfo, totalPrice, shippingFee, guestInfo } = body;

    /**
     * 🔁 각 상품마다 반복문을 돌며,
     * 1. 해당 상품이 실제로 존재하는지 확인
     * 2. 재고가 충분한지 확인
     * 3. 재고 수량에서 구매 수량만큼 차감
     */
    for (const item of items) {
      // console.log(' 주문 상품 ID:', item.productId);
      const productId = new ObjectId(item.productId); // 상품의 MongoDB ObjectId 생성
      const quantity = item.quantity; // 사용자가 구매한 수량
      //  DB 커넥션 가져오기
      const client = await clientPromise;
      const db = client.db();

      //  해당 상품이 실제 존재하는지 조회
      const product = await db.collection('products').findOne({ _id: productId });
      if (!product) {
        //  존재하지 않으면 404 에러 응답
        // console.error(' 상품을 찾을 수 없음:', productId);
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
      }
      // console.log('재고 차감 대상 상품:', {
      //   productId,
      //   quantity,
      //   currentStock: product.stock,
      // });
      if (quantity <= 0) {
        return NextResponse.json({ error: '수량이 잘못되었습니다.' }, { status: 400 });
      }
      // 재고가 부족한 경우 처리 차단
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

      //  상품 재고 차감
      await db.collection('products').updateOne(
        { _id: productId }, // 어떤 상품인지 지정
        {
          $inc: {
            'inventory.stock': -quantity, // stock 필드를 음수로 감소시킴
            sold: quantity, // 누적 판매 수량 증가
          },
        }
      );
    }

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
      items,
      shippingInfo,
      totalPrice,
      shippingFee,
      guestInfo: guestInfo || null,
      paymentInfo,
      createdAt: new Date(),
      status: '대기중',
      isStringServiceApplied: false,
    };

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

    // 성공 응답 반환
    return NextResponse.json({ success: true, orderId: result.insertedId });
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
