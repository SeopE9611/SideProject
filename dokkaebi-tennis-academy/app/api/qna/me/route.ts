import { verifyAccessToken } from '@/lib/auth.utils';
import { findList } from '@/lib/board.repository';
import { getDb } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qna/me?page=1&limit=10
 * - 로그인 사용자가 작성한 QnA(board_posts.type='qna')만 조회
 * - 마이페이지 QnAList.tsx가 바로 렌더링 가능한 형태로 반환
 */
export async function GET(req: NextRequest) {
  // 1) 인증: accessToken 쿠키 기반
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  if (!at) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyAccessToken(at);
  const sub = payload?.sub ? String(payload.sub) : '';
  if (!payload || !sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  // 2) 페이지네이션 파라미터(안전 clamp)
  const url = new URL(req.url);
  const pageRaw = Number(url.searchParams.get('page') ?? '1');
  const limitRaw = Number(url.searchParams.get('limit') ?? '10');

  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1;
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.trunc(limitRaw))) : 10;

  // 3) DB 조회
  const db = await getDb();

  const filter = { type: 'qna', status: 'published', authorId: sub } as const;
  const projection = { title: 1, createdAt: 1, category: 1, answer: 1 } as const;

  const { total, items: rawItems } = await findList(db, 'board_posts', filter as any, projection as any, { createdAt: -1 }, page, limit);

  // 4) 응답 DTO
  const items = (rawItems ?? []).map((doc: any) => {
    const createdAt = doc?.createdAt ? new Date(doc.createdAt) : null;
    const hasAnswer = !!(doc?.answer && typeof doc.answer === 'object' && String(doc?.answer?.content ?? '').trim().length > 0);

    return {
      id: String(doc?._id),
      title: String(doc?.title ?? ''),
      date: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleDateString('ko-KR') : '',
      status: hasAnswer ? '답변 완료' : '답변 대기',
      category: String(doc?.category ?? '일반문의'),
    };
  });

  return NextResponse.json({ items, total });
}
