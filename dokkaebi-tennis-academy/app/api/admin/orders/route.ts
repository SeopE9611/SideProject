// Next.js의 Response 헬퍼 객체를 불러옴
import { NextResponse } from 'next/server';

// 서버에서 세션 정보를 가져오는 auth() 함수 (lib/auth.ts에서 만든 것)
import { auth } from '@/lib/auth';

// MongoDB 클라이언트 (lib/mongodb.ts에 있는 clientPromise)
import clientPromise from '@/lib/mongodb';

// GET 메서드 → 관리자 주문 목록 조회 API
export async function GET() {
  // 현재 로그인한 사용자의 세션 정보 가져오기
  const session = await auth();

  //  관리자 권한이 없는 경우 (로그인 안 했거나 role이 admin이 아닌 경우)
  if (!session?.user || session.user.role !== 'admin') {
    // 401 Unauthorized 응답 반환
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // MongoDB 연결 클라이언트 가져오기
  const client = await clientPromise;
  const db = client.db();

  // orders 컬렉션에서 모든 주문 데이터를 가져옴
  const orders = await db
    .collection('orders')
    .find({}) // 모든 주문
    .sort({ createdAt: -1 }) // 최신순 정렬
    .project({
      _id: 1, // 주문 ID
      createdAt: 1, // 주문 일자
      status: 1, // 현재 주문 상태
      totalPrice: 1, // 총 결제 금액
      'shippingInfo.name': 1, // 수령인 이름
    })
    .toArray(); // 결과를 배열로 변환

  // 성공 응답으로 주문 목록을 JSON 형식으로 반환
  return NextResponse.json({ success: true, orders });
}
