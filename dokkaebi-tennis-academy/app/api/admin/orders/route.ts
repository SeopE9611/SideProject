import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

// GET 메서드 -> 관리자 주문 목록 조회 API
export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

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
