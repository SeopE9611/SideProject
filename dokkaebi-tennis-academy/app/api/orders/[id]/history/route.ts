import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// 히스토리 아이템 타입 정의
interface HistoryEvent {
  status: string;
  date: string;
  description: string;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // 쿼리 파라미터 추출 (NextRequest의 req.url 사용)
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '5', 10);
  const skip = (page - 1) * limit;

  // MongoDB 연결
  const client = await clientPromise;
  const db = client.db();

  // 주문 전체 정보 조회
  const fullOrder = await db.collection('orders').findOne({ _id: new ObjectId(id) });

  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;

  if (!fullOrder) {
    return new NextResponse('주문을 찾을 수 없습니다.', { status: 404 });
  }

  const isOwner = payload?.sub === fullOrder.userId?.toString();
  const isAdmin = payload?.role === 'admin';

  if (fullOrder.userId && !isOwner && !isAdmin) {
    return new NextResponse('권한이 없습니다.', { status: 403 });
  }

  // 히스토리 배열 안전하게 추출 & 타입 단언
  const historyArray = (fullOrder?.history ?? []) as HistoryEvent[];

  // 날짜 기준 내림차순 정렬
  const sorted = historyArray.sort((a: HistoryEvent, b: HistoryEvent) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 페이징 처리
  const paginated = sorted.slice(skip, skip + limit);

  return NextResponse.json({
    history: paginated,
    total: sorted.length,
  });
}
