// 응답 객체를 생성하기 위한 도구
import { NextRequest, NextResponse } from 'next/server';

import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

type OrderResponse = {
  items: {
    id: string;
    date: string;
    status: string;
    totalPrice: number;
    items: { name: string; quantity: number }[];
  }[];
  total: number;
};
//  GET 요청 처리 함수 (로그인된 유저의 주문 내역 조회)
export async function GET(req: NextRequest) {
  // 인증
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload?.sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const userId = payload.sub;

  // 페이지 파라미터
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  try {
    //  MongoDB 클라이언트에 연결
    const client = await clientPromise;
    const db = client.db();

    // 전체 개수
    const total = await db.collection('orders').countDocuments({ userId: new ObjectId(userId) });

    //  로그인된 사용자의 ID 기준으로 주문 내역을 조회
    const rawOrders = await db
      .collection('orders') // 'orders' 컬렉션에서
      .find({ userId: new ObjectId(userId) }) // 로그인된 유저의 주문만 필터링
      .sort({ createdAt: -1 }) // 최신 주문 순으로 정렬
      .skip(skip) // 페이징 쿼리 (skip/limit)
      .limit(limit)
      .toArray(); // 배열 형태로 변환

    // 각 주문 매핑
    const items = await Promise.all(
      rawOrders.map(async (order) => {
        // 상품명 매핑
        const mappedItems = await Promise.all(
          order.items.map(async (it: { productId: ObjectId; quantity: number }) => {
            const prod = await db.collection('products').findOne({ _id: new ObjectId(it.productId) }, { projection: { name: 1 } });
            return {
              name: prod?.name || '알 수 없음',
              quantity: it.quantity,
            };
          })
        );

        return {
          id: order._id.toString(),
          date: order.createdAt.toISOString(),
          status: order.status,
          totalPrice: order.totalPrice,
          items: mappedItems,
        };
      })
    );

    const result: OrderResponse = { items, total };
    return NextResponse.json(result);
  } catch (err) {
    //  예외 상황 로깅
    console.error('ORDER_LIST_ERR', err);
    //  서버 내부 오류 응답
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
