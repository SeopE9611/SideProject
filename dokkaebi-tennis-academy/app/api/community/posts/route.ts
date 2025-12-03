import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import { COMMUNITY_BOARD_TYPES, COMMUNITY_CATEGORIES, CommunityBoardType, CommunityPost } from '@/lib/types/community';

// -------------------------- 유틸: 인증/작성자 이름 ---------------------------

// 로그인된 사용자 정보 가져오기 (없으면 null)
async function getAuthPayload() {
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  if (!token) return null;
  const payload = verifyAccessToken(token);
  return payload ?? null;
}

/**
 * 표시용 작성자 이름 결정 로직
 * - users 컬렉션의 name/nickname → payload.name/nickname → email 앞부분
 */
async function resolveDisplayName(payload: any | null): Promise<string> {
  const db = await getDb();
  let displayName: string | null = null;

  try {
    if (payload?.sub) {
      const u = await db.collection('users').findOne({ _id: new ObjectId(String(payload.sub)) });
      // 런타임에서만 쓰이므로 any 허용
      // @ts-ignore
      displayName = u?.name ?? u?.nickname ?? undefined;
    }
  } catch {
    // 이름 조회 실패해도 치명적이진 않으니 무시
  }

  // @ts-ignore
  if (!displayName) {
    displayName = payload?.name ?? payload?.nickname ?? payload?.email?.split('@')?.[0] ?? '회원';
  }

  return displayName ?? '회원';
}

// ----------------------------- Zod 스키마 ----------------------------------

// 커뮤니티 글 생성 요청 바디 검증 스키마
const createSchema = z.object({
  type: z.enum(COMMUNITY_BOARD_TYPES),

  title: z.string().min(1, '제목을 입력해 주세요.').max(200, '제목은 200자 이내로 입력해 주세요.'),

  content: z.string().min(1, '내용을 입력해 주세요.'),

  // 브랜드 게시판일 때만 의미 있음 (자유 게시판은 null/undefined)
  brand: z.string().max(100, '브랜드명은 100자 이내로 입력해 주세요.').optional().nullable(),

  // 자유 게시판 카테고리 (제목 머릿말 용)
  // - 폼에서 아직 값을 안 보내도 기본값 'general' 로 처리
  category: z.enum(COMMUNITY_CATEGORIES).optional().default('general'),

  // 첨부 이미지 URL 리스트 (Supabase 업로더와 호환)
  images: z.array(z.string()).max(10).optional(),
});

/**
 * 리스트 조회 쿼리 파라미터:
 * - type: free | brand (선택)
 * - brand: 브랜드명 (선택, type=brand 일 때 주로 사용)
 * - sort: latest | views | likes | hot
 * - page, limit: 페이징
 */
function parseListQuery(req: NextRequest): {
  typeParam: CommunityBoardType | null;
  brand: string | null;
  sort: 'latest' | 'views' | 'likes' | 'hot';
  page: number;
  limit: number;
  q: string;
} {
  const url = new URL(req.url);

  const rawType = url.searchParams.get('type');
  const typeParam = (rawType as CommunityBoardType | null) ?? null;

  const brand = url.searchParams.get('brand'); // string | null

  const sortParam = (url.searchParams.get('sort') || 'latest') as 'latest' | 'views' | 'likes' | 'hot';

  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)));

  const q = url.searchParams.get('q') || '';

  return {
    typeParam,
    brand, // 명시적으로 string | null
    sort: sortParam,
    page,
    limit,
    q,
  };
}

// ------------------------------- GET ---------------------------------------

/**
 * 커뮤니티 게시글 리스트 조회
 * - /api/community/posts?type=free
 * - /api/community/posts?type=brand&brand=wilson
 * - /api/community/posts?sort=hot&limit=20
 */
export async function GET(req: NextRequest) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const db = await getDb();
  const col = db.collection('community_posts');

  const { typeParam, brand, sort, page, limit, q } = parseListQuery(req);

  const filter: any = { status: 'public' as const };

  if (typeParam) {
    filter.type = typeParam;
  }

  if (brand) {
    filter.brand = brand;
  }

  // 간단한 제목/본문 검색
  if (q) {
    filter.$or = [{ title: { $regex: q, $options: 'i' } }, { content: { $regex: q, $options: 'i' } }];
  }

  // 정렬 기준
  let sortOption: any;
  switch (sort) {
    case 'views':
      sortOption = { views: -1, createdAt: -1 };
      break;
    case 'likes':
      sortOption = { likes: -1, createdAt: -1 };
      break;
    case 'hot':
      // 간단한 "인기" 정의: 조회수 > 좋아요 > 댓글 > 최신순
      sortOption = {
        views: -1,
        likes: -1,
        commentsCount: -1,
        createdAt: -1,
      };
      break;
    case 'latest':
    default:
      sortOption = { createdAt: -1 };
      break;
  }

  const skip = (page - 1) * limit;

  const total = await col.countDocuments(filter);
  const docs = await col.find(filter).sort(sortOption).skip(skip).limit(limit).toArray();

  const items: CommunityPost[] = docs.map((d: any) => ({
    id: String(d._id),
    type: d.type,
    title: d.title,
    content: d.content,
    brand: d.brand ?? null,

    category: d.category ?? 'general',
    images: Array.isArray(d.images) ? d.images : [],
    postNo: typeof d.postNo === 'number' ? d.postNo : undefined,
    authorName: d.authorName,
    authorEmail: d.authorEmail,

    userId: d.userId ? String(d.userId) : null,
    nickname: d.nickname ?? '회원',
    status: d.status ?? 'public',
    views: d.views ?? 0,
    likes: d.likes ?? 0,
    commentsCount: d.commentsCount ?? 0,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt ? String(d.updatedAt) : undefined,
  }));

  logInfo({
    msg: 'community:list',
    status: 200,
    durationMs: stop(),
    extra: { total, page, limit, sort, type: typeParam, brand },
    ...meta,
  });

  return NextResponse.json(
    { ok: true, items, total, page, limit },
    {
      headers: {
        // 목록은 짧게 캐시 (필요 시 조정 가능)
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
        'Vercel-CDN-Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}

// ------------------------------- POST --------------------------------------

/**
 * 커뮤니티 게시글 작성
 * - 현재 버전: 로그인한 회원만 작성 가능
 *   (추후 비회원/닉네임 기반 익명 작성 허용도 확장 가능)
 */
export async function POST(req: NextRequest) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const payload = await getAuthPayload();
  if (!payload) {
    logInfo({
      msg: 'community:create:unauthorized',
      status: 401,
      durationMs: stop(),
      ...meta,
    });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const bodyRaw = await req.json();
  const parsed = createSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    logInfo({
      msg: 'community:create:validation_failed',
      status: 400,
      durationMs: stop(),
      extra: { issues: parsed.error.issues },
      ...meta,
    });
    return NextResponse.json({ ok: false, error: 'validation_error', details: parsed.error.issues }, { status: 400 });
  }

  const body = parsed.data;

  const db = await getDb();
  const col = db.collection('community_posts');

  type CounterDoc = { _id: string; seq: number };

  const countersCol = db.collection<CounterDoc>('counters');

  // 게시판 내 노출용 번호 (자유 게시판에만 사용)
  let postNo: number | undefined = undefined;

  if (body.type === 'free') {
    const counterId = 'community_free';

    const counterResult = await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    // findOneAndUpdate 결과가 "문서 또는 null"이므로 그대로 seq만 안전하게 읽어온다
    const seq = counterResult?.seq;
    postNo = typeof seq === 'number' ? seq : 1;
  }

  const displayName = await resolveDisplayName(payload);
  const now = new Date();

  const doc = {
    type: body.type,
    title: body.title,
    content: body.content,

    // 브랜드 게시판이 아닐 때는 항상 null
    brand: body.type === 'brand' ? body.brand ?? null : null,

    // 자유 게시판 카테고리 (제목 머릿말)
    category: body.category ?? 'general',

    // 첨부 이미지 URL 배열 (없으면 빈 배열)
    images: body.images && body.images.length > 0 ? body.images : [],

    // 게시판 내 노출용 번호 (자유 게시판만 사용)
    postNo,

    userId: new ObjectId(String(payload.sub)),
    nickname: displayName,

    status: 'public' as const,
    views: 0,
    likes: 0,
    commentsCount: 0,

    createdAt: now,
    updatedAt: now,
  };

  const r = await col.insertOne(doc as any);

  logInfo({
    msg: 'community:create:success',
    status: 201,
    durationMs: stop(),
    extra: { id: r.insertedId.toString(), type: body.type },
    ...meta,
  });

  return NextResponse.json({ ok: true, id: r.insertedId.toString() }, { status: 201 });
}
