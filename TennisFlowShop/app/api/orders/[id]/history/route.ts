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

  // id 유효성: new ObjectId(id)에서 throw로 500 나는 것 방지
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  }
  const orderId = new ObjectId(id);

  // 쿼리 파라미터 추출 (NextRequest의 req.url 사용)
  const { searchParams } = new URL(req.url);

  // NaN 방어 + 범위 클램프(기존 기본값 유지: page=1, limit=5)
  const pageRaw = parseInt(searchParams.get('page') || '1', 10);
  const limitRaw = parseInt(searchParams.get('limit') || '5', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 5;
  const skip = (page - 1) * limit;

  // MongoDB 연결
  const client = await clientPromise;
  const db = client.db();

  // 주문 전체 정보 조회
  const fullOrder = await db.collection('orders').findOne({ _id: orderId });

  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  // 토큰이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 "인증 없음"으로 처리
  let payload: any = null;
  try {
    payload = token ? verifyAccessToken(token) : null;
  } catch {
    payload = null;
  }

  if (!fullOrder) {
    return new NextResponse('주문을 찾을 수 없습니다.', { status: 404 });
  }

  const isOwner = payload?.sub === fullOrder.userId?.toString();
  const isAdmin = payload?.role === 'admin';

  if (fullOrder.userId && !isOwner && !isAdmin) {
    return new NextResponse('권한이 없습니다.', { status: 403 });
  }

  // 히스토리 배열 원본(레거시 포함) 추출
  const rawHistory = (fullOrder?.history ?? []) as any[];

  /**
   * 레거시 호환 정규화
   * - 신규: { status, date, description }
   * - 레거시: { status, createdAt, message }
   * => API 응답은 항상 { status, date(ISO string), description }로 통일
   */
  const normalized: HistoryEvent[] = rawHistory.map((h) => {
    const status = typeof h?.status === 'string' && h.status.trim() ? h.status : '기록';

    // description: 신규(description) 우선, 없으면 레거시(message) fallback
    const description = typeof h?.description === 'string' ? h.description : typeof h?.message === 'string' ? h.message : '-';

    // date: 신규(date) 우선, 없으면 레거시(createdAt) fallback
    const rawDate = h?.date ?? h?.createdAt ?? null;

    // Date 파싱 (문자열/Date 모두 처리)
    const d = rawDate instanceof Date ? rawDate : typeof rawDate === 'string' || typeof rawDate === 'number' ? new Date(rawDate) : null;

    // Invalid Date 방지: 파싱 실패 시 epoch로 강제
    const iso = d && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date(0).toISOString();

    return { status, date: iso, description };
  });

  // 날짜 기준 내림차순 정렬 (안전)
  const sorted = normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 페이징 처리
  const paginated = sorted.slice(skip, skip + limit);

  return NextResponse.json({
    history: paginated,
    total: sorted.length,
  });
}
