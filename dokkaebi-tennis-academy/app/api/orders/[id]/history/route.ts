import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

// GET /api/orders/[id]/history?page=1&limit=5
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  //  URL에서 page, limit 쿼리 파라미터 추출
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '5', 10);
  const skip = (page - 1) * limit;

  //  MongoDB 연결
  const client = await clientPromise;
  const db = client.db();

  //  주문 전체 이력을 가져와 total 개수 계산
  const fullOrder = await db.collection('orders').findOne({ _id: new ObjectId(id) });

  const fullHistory = fullOrder?.history || [];
  const total = fullHistory.length;

  //  페이지 범위 만큼 슬라이스해서 보내기
  const paginatedHistory = fullHistory.slice(skip, skip + limit);

  return NextResponse.json({
    history: paginatedHistory,
    total,
  });
}
