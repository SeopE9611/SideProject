import { NextRequest } from 'next/server';
import { createOrder, getOrders } from '@/app/features/orders/api/handlers';

// POST 메서드 처리 함수 – 주문 생성
export async function POST(req: Request) {
  return createOrder(req);
}
// GET 요청 처리: 관리자 주문 목록 요청 처리
export async function GET(req: NextRequest) {
  return getOrders(req);
}
