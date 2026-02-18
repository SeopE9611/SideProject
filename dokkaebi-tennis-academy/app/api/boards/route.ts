import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';
import type { BoardPost, BoardType, QnaCategory } from '@/lib/types/board';
import { ObjectId } from 'mongodb';
import { sanitizeHtml } from '@/lib/sanitize';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import { getBoardList } from '@/lib/boards.queries';
import { API_VERSION } from '@/lib/board.repository';
import { MAX_COMMUNITY_SEARCH_QUERY_LENGTH, buildCommunityListMongoFilter, getCommunitySortOption, parseCommunityListQuery } from '@/lib/community-list-query';
import { maskSecretTitle, resolveBoardViewerContext } from '@/lib/board-secret-policy';
import { validateBoardAssetUrl } from '@/lib/boards-community-url-policy';

/**
 * 숫자 쿼리 파라미터 파싱(Phase 0 - 500 방지)
 * - NaN이면 defaultValue 적용
 * - min/max 범위로 clamp
 */
function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

// 관리자 확인 헬퍼
async function mustAdmin() {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  if (!at) return null;

  let payload: any = null;
  try {
    payload = verifyAccessToken(at);
  } catch {
    payload = null;
  }

  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) return null;

  const db = await getDb();
  const u = await db.collection('users').findOne({ _id: new ObjectId(subStr) }, { projection: { _id: 1, role: 1 } });

  if (!u || u.role !== 'admin') return null;
  return payload;
}

/**
 * QnA 카테고리 라벨(한글) 목록
 * lib/types/board.ts 의 QnaCategory 유니온과 1:1 이어야 합니다.
 * (예: '상품문의' | '주문/결제' | '배송' | '환불/교환' | '서비스' | '아카데미' | '회원' | '일반문의')
 */
const QNA_CATEGORY_LABELS = ['상품문의', '주문/결제', '배송', '환불/교환', '서비스', '아카데미', '회원', '일반문의'] as const satisfies readonly QnaCategory[];

/** UI/쿼리에서 사용하는 코드 값 */
const QNA_CATEGORY_CODES = [
  // 아래 코드는 UI의 SelectItem value 값과 일치시켜 주세요.
  'product',
  'order',
  'delivery',
  'refund',
  'service',
  'academy',
  'member',
  // 필요시 확장용
  'general', // '일반문의' 용 코드 (선택사항)
] as const;

/** ---- Notice 카테고리(라벨) ---- */
const NOTICE_CATEGORY_LABELS = ['일반', '이벤트', '아카데미', '점검', '긴급'] as const;
const NOTICE_CATEGORY_CODES = ['general', 'event', 'academy', 'maintenance', 'urgent'] as const;
const NOTICE_CODE_TO_LABEL: Record<(typeof NOTICE_CATEGORY_CODES)[number], (typeof NOTICE_CATEGORY_LABELS)[number]> = {
  general: '일반',
  event: '이벤트',
  academy: '아카데미',
  maintenance: '점검',
  urgent: '긴급',
};

function normalizeNoticeCategory(input: string | null | undefined) {
  if (!input) return null;
  if ((NOTICE_CATEGORY_CODES as readonly string[]).includes(input)) {
    // @ts-expect-error - 위 includes로 보장
    return NOTICE_CODE_TO_LABEL[input];
  }
  if ((NOTICE_CATEGORY_LABELS as readonly string[]).includes(input)) return input as (typeof NOTICE_CATEGORY_LABELS)[number];
  return null;
}

/** 코드 -> 라벨 매핑 (모든 코드는 반드시 라벨 중 하나로 매핑) */
const CODE_TO_LABEL: Record<(typeof QNA_CATEGORY_CODES)[number], QnaCategory> = {
  product: '상품문의',
  order: '주문/결제',
  delivery: '배송',
  refund: '환불/교환',
  service: '서비스',
  academy: '아카데미',
  member: '회원',
  general: '일반문의',
} as const;

/** 라벨 배열(런타임 비교용) */
const QNA_LABEL_SET: readonly string[] = QNA_CATEGORY_LABELS as readonly string[];

/** 런타임 타입가드: 값이 실제 QnaCategory 라벨인지 검사 */
const isQnaCategory = (v: unknown): v is QnaCategory => typeof v === 'string' && QNA_LABEL_SET.includes(v);

/**
 * 카테고리 정규화:
 * - 코드('product' 등)이면 라벨('상품문의')로 변환
 * - 라벨이 이미 들어왔다면 유효성 검사 후 그대로 사용
 * - 그 외 문자열/오타는 null 반환(필터 미적용)
 */
function normalizeCategory(input: string | null | undefined): QnaCategory | null {
  if (!input) return null;
  // 코드로 들어온 경우
  if ((QNA_CATEGORY_CODES as readonly string[]).includes(input)) {
    // @ts-expect-error - 위 includes로 보장됨
    const label = CODE_TO_LABEL[input];
    return label;
  }
  // 라벨로 들어온 경우 유효성 확인
  if (isQnaCategory(input)) return input;
  return null; // 알 수 없는 문자열이면 사용하지 않음
}

/* ----------------------------- 입력 검증 스키마 ----------------------------- */
const productRefSchema = z
  .object({
    productId: z.string().transform((s) => s.trim().replace(/^<|>$/g, '')),
    name: z.string().optional(),
    image: z.string().url().nullable().optional(),
  })
  .optional();

const typeSchema = z.enum(['notice', 'qna', 'free', 'market', 'gear'] as const);

// category는 "코드 or 라벨" QnA + Notice 모두 허용
const categorySchema = z
  .union([
    z.enum(QNA_CATEGORY_CODES as unknown as [string, ...string[]]),
    z.enum(QNA_CATEGORY_LABELS as unknown as [string, ...string[]]),
    z.enum(NOTICE_CATEGORY_CODES as unknown as [string, ...string[]]),
    z.enum(NOTICE_CATEGORY_LABELS as unknown as [string, ...string[]]),
    z.enum(['general', 'info', 'qna', 'tip', 'etc', 'racket', 'string', 'equipment', 'shoes', 'bag', 'apparel', 'grip', 'accessory', 'ball', 'other'] as [string, ...string[]]),
  ])
  .optional();

const createSchema = z.object({
  type: typeSchema,
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(2).max(20000),
  category: categorySchema, // qna에서만 사용
  productRef: productRefSchema,
  isSecret: z.boolean().optional(),
  isPinned: z.boolean().optional(), // notice에서만 사용
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string(),
        size: z.number().optional(),
        mime: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    )
    .optional(),
});

const isAllowedHttpUrl = (v: unknown): v is string => {
  const validation = validateBoardAssetUrl(v);
  return validation.ok;
};

/* ---------------------------------- GET ---------------------------------- */
export async function GET(req: NextRequest) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const url = new URL(req.url);

  const typeParam = url.searchParams.get('type');
  const kindParam = url.searchParams.get('kind');
  const rawCategory = url.searchParams.get('category'); // string | null
  const productId = url.searchParams.get('productId');
  const answerRaw = url.searchParams.get('answer') || '';

  // NaN 방지: page/limit가 비정상 값이면 기본값으로 안전하게 보정
  const page = parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
  const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 10, min: 1, max: 50 });

  const q = url.searchParams.get('q') || url.searchParams.get('keyword') || url.searchParams.get('query') || '';

  const fieldRaw = url.searchParams.get('field') || 'all';

  // 허용된 field 값만 사용, 그 외는 all 처리
  const allowedFields = new Set(['all', 'title', 'content', 'title_content']);
  const field = (allowedFields.has(fieldRaw) ? fieldRaw : 'all') as 'all' | 'title' | 'content' | 'title_content';

  // type 유효성 가드: 기본은 notice, 'qna'면 qna로
  const type: BoardType = typeParam === 'qna' ? 'qna' : 'notice';

  const communityKind = kindParam && ['free', 'market', 'gear'].includes(kindParam) ? kindParam : null;

  if (communityKind) {
    const db = await getDb();
    const col = db.collection('community_posts');
    const { brand, sort, page, limit, q, escapedQ, isQueryTooLong, authorObjectId, searchType, category } = parseCommunityListQuery(req, {
      queryKeys: ['q', 'keyword', 'query'],
    });

    if (isQueryTooLong) {
      return NextResponse.json(
        {
          ok: false,
          error: 'query_too_long',
          message: `검색어는 최대 ${MAX_COMMUNITY_SEARCH_QUERY_LENGTH}자까지 입력할 수 있습니다.`,
        },
        { status: 400 },
      );
    }

    /**
     * communityKind 분기의 쿼리 파싱/반영 계약표
     *
     * | 쿼리 키 | 파싱 소스(parseCommunityListQuery) | 실제 반영 위치 |
     * | --- | --- | --- |
     * | sort | sort | find().sort(getCommunitySortOption(sort)) |
     * | searchType | searchType | buildCommunityListMongoFilter 내부 title/nickname/$or 분기 |
     * | authorId | authorObjectId (ObjectId 유효성 검사 포함) | buildCommunityListMongoFilter 내부 userId 필터 |
     * | brand | brand | buildCommunityListMongoFilter 내부 brand 필터 |
     * | category | category (허용 카테고리만 통과) | buildCommunityListMongoFilter 내부 category 필터 |
     * | q | q + escapedQ | buildCommunityListMongoFilter 내부 검색 regex 필터 |
     */
    const filter = buildCommunityListMongoFilter({
      typeParam: communityKind,
      brand,
      category,
      q,
      escapedQ,
      authorObjectId,
      searchType,
    });

    const total = await col.countDocuments(filter);
    const docs = await col.find(filter).sort(getCommunitySortOption(sort)).skip((page - 1) * limit).limit(limit).toArray();
    const items = docs.map((d: any) => ({
      id: String(d._id),
      type: d.type,
      title: d.title,
      content: d.content,
      category: d.category ?? 'general',
      userId: d.userId ? String(d.userId) : null,
      nickname: d.nickname ?? '회원',
      status: d.status ?? 'public',
      views: d.views ?? 0,
      likes: d.likes ?? 0,
      commentsCount: d.commentsCount ?? 0,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : undefined,
      attachments: d.attachments ?? [],
      images: d.images ?? [],
      brand: d.brand ?? null,
      postNo: d.postNo,
    }));
    return NextResponse.json({ ok: true, version: API_VERSION, items, total, page, limit });
  }

  // 타입별 카테고리 정규화
  let category: string | null = null;
  if (type === 'notice') {
    const n = normalizeNoticeCategory(rawCategory);
    if (n) category = n; // 공지는 라벨('일반','이벤트' 등)로 저장됨
  } else if (type === 'qna') {
    const n = normalizeCategory(rawCategory); // 코드/라벨 → QnA 라벨로
    if (n) category = n as QnaCategory;
  }

  logInfo({
    msg: 'boards:list:query',
    status: 200,
    durationMs: 0,
    extra: { type: typeParam, category: rawCategory, productId, answer: answerRaw, page, limit, q, field: fieldRaw },
    ...meta,
  });

  const answer = answerRaw === 'waiting' || answerRaw === 'completed' ? (answerRaw as 'waiting' | 'completed') : null;

  // 공용 MongoDB 쿼리 함수 사용
  const { items, total } = await getBoardList({
    type,
    page,
    limit,
    q,
    field,
    category,
    productId: productId || null,
    answer,
  });

  const accessToken = (await cookies()).get('accessToken')?.value;
  const viewer = await resolveBoardViewerContext({
    accessToken,
    verifyToken: verifyAccessToken,
    fetchUserRoleById: async (userId: string) => {
      if (!ObjectId.isValid(userId)) return null;
      const db = await getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
      return typeof user?.role === 'string' ? user.role : null;
    },
  });

  const maskedItems =
    type === 'qna'
      ? items.map((item) =>
          maskSecretTitle(item, {
            viewerId: viewer.viewerId,
            isAdmin: viewer.isAdmin,
          }),
        )
      : items;

  logInfo({
    msg: 'boards:list:ok',
    status: 200,
    durationMs: stop(),
    extra: { count: items.length, total },
    ...meta,
  });

  return NextResponse.json(
    { ok: true, version: API_VERSION, items: maskedItems, total, page, limit },
    {
      headers: {
        // 브라우저 캐시는 짧게(or 없음), CDN은 30초, 그리고 SWR 60초
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
        'Vercel-CDN-Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}

/* ---------------------------------- POST --------------------------------- */
export async function POST(req: NextRequest) {
  const stop = startTimer();
  const meta = reqMeta(req);
  // 인증
  const token = (await cookies()).get('accessToken')?.value;

  // verifyAccessToken은 throw 가능 → 500 방지를 위해 try/catch로 401 처리
  let payload: any = null;
  if (token) {
    try {
      payload = verifyAccessToken(token);
    } catch {
      payload = null;
    }
  }
  if (!payload || !payload?.sub) {
    logInfo({ msg: 'boards:post:unauthorized', status: 401, durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'unauthorized' }, { status: 401 });
  }
  // 입력 검증
  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    // 잘못된 JSON/빈 body 등에서 req.json()이 throw → 400으로 정리
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    logInfo({ msg: 'boards:post:validation_failed', status: 400, durationMs: stop(), extra: { issues: parsed.error.issues }, ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  if (body.type === 'free' || body.type === 'market' || body.type === 'gear') {
    const db = await getDb();
    const now = new Date();
    const doc = {
      type: body.type,
      title: body.title,
      content: body.content,
      category: body.category ?? 'general',
      brand: null,
      images: [],
      attachments: body.attachments ?? [],
      userId: new ObjectId(String(payload.sub)),
      nickname: payload?.name ?? payload?.nickname ?? payload?.email?.split('@')?.[0] ?? '회원',
      status: 'public',
      views: 0,
      likes: 0,
      commentsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const r = await db.collection('community_posts').insertOne(doc as any);
    return NextResponse.json({ ok: true, version: API_VERSION, id: r.insertedId.toString() }, { status: 201 });
  }

  // 표시명 결정: users.name -> users.nickname -> payload.name -> payload.nickname -> email local-part
  const db = await getDb();
  let displayName: string | undefined = undefined;
  try {
    // payload.sub → ObjectId 변환 전 선검증(Phase 0 - 500 방지)
    const subStr = String(payload.sub);
    if (ObjectId.isValid(subStr)) {
      const u = await db.collection('users').findOne({ _id: new ObjectId(subStr) });
      displayName = u?.name ?? u?.nickname ?? undefined;
    }
  } catch (_) {}
  const payloadName = payload as { name?: string; nickname?: string; email?: string } | undefined;
  if (!displayName) displayName = payloadName?.name ?? payloadName?.nickname ?? payloadName?.email?.split('@')?.[0];

  // 카테고리 정규화 (qna에서만 사용)
  let normalizedCategory: QnaCategory | undefined = undefined;
  if (body.type === 'qna') {
    const norm = normalizeCategory(body.category);
    normalizedCategory = norm ?? '일반문의';
  } else if (body.type === 'notice') {
    const norm = normalizeNoticeCategory(body.category);
    normalizedCategory = norm ?? '일반'; // 기본값
  }

  if (body?.type === 'notice') {
    const admin = await mustAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, version: API_VERSION, message: 'forbidden' }, { status: 403 });
    }
  }

  const now = new Date();

  // 첨부 URL 화이트리스트 필터링
  const safeAttachments = Array.isArray(body.attachments) ? body.attachments.filter((a) => a?.url && isAllowedHttpUrl(a.url)) : [];

  // 본문 content 서버에서 정제
  const safeContent = await sanitizeHtml(String(body.content ?? ''));

  const doc: BoardPost = {
    type: body.type as BoardType,
    title: body.title,
    // content: body.content,
    content: safeContent,
    category: normalizedCategory, // BoardPost['category']는 QnaCategory | undefined
    productRef: body.type === 'qna' ? body.productRef : undefined,
    isSecret: body.type === 'qna' ? !!body.isSecret : false,
    isPinned: body.type === 'notice' ? !!body.isPinned : false,
    attachments: safeAttachments,
    authorId: String(payload.sub),
    authorName: displayName,
    status: 'published',
    viewCount: 0,
    createdAt: now,
  };

  const r = await db.collection('board_posts').insertOne(doc as any);
  logInfo({ msg: 'boards:post:created', status: 200, durationMs: stop(), extra: { id: r.insertedId.toString() }, ...meta });
  return NextResponse.json({ ok: true, version: API_VERSION, id: r.insertedId.toString() });
}
