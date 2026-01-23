import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

// GET 메서드 -> 관리자 주문 목록 조회 API
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  //  관리자 권한이 없는 경우 (로그인 안 했거나 role이 admin이 아닌 경우)
  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const payload = safeVerifyAccessToken(token);
  if (!payload || payload.role !== 'admin') {
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
