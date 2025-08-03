// 응답 객체를 생성하기 위한 도구
import { NextRequest, NextResponse } from 'next/server';

// 로그인 세션 정보를 가져오기 위한 함수
import jwt, { JwtPayload } from 'jsonwebtoken';

import { ObjectId } from 'mongodb';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

//  GET 요청 처리 함수 (로그인된 유저의 주문 내역 조회)
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyAccessToken(token);
  if (!payload?.sub) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
  }

  // sub 클레임(사용자 _id) 반드시 확인
  const userId = payload.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
  }
  try {
    //  MongoDB 클라이언트에 연결
    const client = await clientPromise;
    const db = client.db(); // 기본 DB 선택 (보통 .env로 정의된 DB 사용됨)

    //  로그인된 사용자의 ID 기준으로 주문 내역을 조회
    const orders = await db
      .collection('orders') // 'orders' 컬렉션에서
      .find({ userId: new ObjectId(userId) }) // 로그인된 유저의 주문만 필터링
      .sort({ date: -1 }) // 최신 주문 순으로 정렬
      .toArray(); // 배열 형태로 변환

    const sanitized = await Promise.all(
      orders.map(async (order) => {
        // 1) 날짜 매핑
        const date = order.createdAt.toISOString();

        // 2) items 매핑 (상품명 조회)
        const items = await Promise.all(
          order.items.map(async (item: { productId: ObjectId; quantity: number }) => {
            const product = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });
            return {
              name: product?.name ?? '알 수 없음',
              quantity: item.quantity,
            };
          })
        );

        return {
          id: order._id.toString(),
          date,
          total: order.totalPrice,
          status: order.status,
          items,
          totalPrice: order.totalPrice,
          userSnapshot: order.userSnapshot ?? null,
        };
      })
    );

    //  JSON 형식으로 주문 데이터 반환
    return NextResponse.json(sanitized);
  } catch (error) {
    //  예외 상황 로깅
    console.error('[USER_ORDERS_GET]', error);

    //  서버 내부 오류 응답
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
