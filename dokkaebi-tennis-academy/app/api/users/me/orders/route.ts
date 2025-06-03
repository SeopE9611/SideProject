// 응답 객체를 생성하기 위한 도구
import { NextResponse } from 'next/server';

// 로그인 세션 정보를 가져오기 위한 함수
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth.config';

//  MongoDB 클라이언트 연결 (clientPromise는 연결이 보장된 Promise 객체)
import clientPromise from '@/lib/mongodb';

//  GET 요청 처리 함수 (로그인된 유저의 주문 내역 조회)
export async function GET() {
  //  세션(로그인 정보)을 가져온다
  const session = await getServerSession(authConfig);

  //  로그인되어 있지 않다면 401(Unauthorized) 응답을 반환
  if (!session || !session.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    //  MongoDB 클라이언트에 연결
    const client = await clientPromise;
    const db = client.db(); // 기본 DB 선택 (보통 .env로 정의된 DB 사용됨)

    //  로그인된 사용자의 ID 기준으로 주문 내역을 조회
    const orders = await db
      .collection('orders') // 'orders' 컬렉션에서
      .find({ userId: session.user.id }) // 로그인된 유저의 주문만 필터링
      .sort({ date: -1 }) // 최신 주문 순으로 정렬
      .toArray(); // 배열 형태로 변환

    // _id 필드는 응답에서 완전히 빠지고 id만
    const sanitized = orders.map((order) => {
      const { _id, ...rest } = order;
      return {
        id: _id.toString(),
        ...rest,
        userSnapshot: order.userSnapshot ?? null,
      };
    });

    //  JSON 형식으로 주문 데이터 반환
    return NextResponse.json(sanitized);
  } catch (error) {
    //  예외 상황 로깅
    console.error('[USER_ORDERS_GET]', error);

    //  서버 내부 오류 응답
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
