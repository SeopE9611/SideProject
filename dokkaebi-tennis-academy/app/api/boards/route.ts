import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';
import type { BoardPost, BoardType, QnaCategory } from '@/lib/types/board';
import { ObjectId } from 'mongodb';
import { sanitizeHtml } from '@/lib/sanitize';

// 관리자 확인 헬퍼
async function mustAdmin() {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  return payload && payload.role === 'admin' ? payload : null;
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

const typeSchema = z.enum(['notice', 'qna'] as const);

// category는 "코드 or 라벨" QnA + Notice 모두 허용
const categorySchema = z
  .union([
    z.enum(QNA_CATEGORY_CODES as unknown as [string, ...string[]]),
    z.enum(QNA_CATEGORY_LABELS as unknown as [string, ...string[]]),
    z.enum(NOTICE_CATEGORY_CODES as unknown as [string, ...string[]]),
    z.enum(NOTICE_CATEGORY_LABELS as unknown as [string, ...string[]]),
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
      })
    )
    .optional(),
});

/** ---- Supabase 퍼블릭 URL만 허용 ---- */
const ALLOWED_HOSTS = new Set<string>(['cwzpxxahtayoyqqskmnt.supabase.co']);
const ALLOWED_PATH_PREFIXES = ['/storage/v1/object/public/tennis-images/'];
const isAllowedHttpUrl = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try {
    const { protocol, hostname, pathname } = new URL(v);
    const okProto = protocol === 'https:' || protocol === 'http:';
    const okHost = ALLOWED_HOSTS.has(hostname);
    const okPath = ALLOWED_PATH_PREFIXES.some((p) => pathname.startsWith(p));
    return okProto && okHost && okPath;
  } catch {
    return false;
  }
};

/* ---------------------------------- GET ---------------------------------- */
export async function GET(req: NextRequest) {
  const db = await getDb();
  const url = new URL(req.url);

  const typeParam = url.searchParams.get('type');
  const rawCategory = url.searchParams.get('category'); // string | null
  const productId = url.searchParams.get('productId');
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)));

  // 키워드 검색 파라미터
  const q = url.searchParams.get('q') || url.searchParams.get('keyword') || url.searchParams.get('query') || '';

  // type 유효성 가드
  const type: BoardType | null = typeParam === 'notice' || typeParam === 'qna' ? (typeParam as BoardType) : null;

  const filter: any = { status: 'published' };
  if (type) filter.type = type;

  // 타입별 카테고리 정규화
  if (type === 'notice') {
    const n = normalizeNoticeCategory(rawCategory);
    if (n) filter.category = n; // 공지는 '일반','이벤트' 등 라벨로 저장됨
  } else if (type === 'qna') {
    const n = normalizeCategory(rawCategory); // 코드/라벨 → QnA 라벨로
    if (n) filter.category = n as QnaCategory;
  }

  if (productId) filter['productRef.productId'] = productId;

  // 검색 필드: all | title | content | title_content (한글 라벨도 허용)
  const fieldRaw = (url.searchParams.get('field') || 'all').toLowerCase();
  const field = ['title', '제목'].includes(fieldRaw) ? 'title' : ['content', '내용'].includes(fieldRaw) ? 'content' : ['title_content', '제목+내용', '제목내용', '제목내용전체'].includes(fieldRaw) ? 'title_content' : 'all';

  // 정규식 이스케이프
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 검색 적용 (부분일치: 공지 → 공지1/공지2 전부 매칭)
  if (q.trim()) {
    const re = new RegExp(esc(q.trim()), 'i');

    if (field === 'title') {
      filter.title = { $regex: re };
    } else if (field === 'content') {
      filter.content = { $regex: re };
    } else {
      // all 또는 title_content: 제목+내용 OR
      filter.$or = [{ title: { $regex: re } }, { content: { $regex: re } }];
    }
  }
  // 목록에서는 비밀글이라도 제목/메타는 노출(본문/첨부는 상세에서 제한)
  const col = db.collection('board_posts');

  const total = await col.countDocuments(filter);

  // 정렬: 공지는 핀 우선 + 최신, 나머지는 최신
  const sort = type === 'notice' ? { isPinned: -1, createdAt: -1 } : { createdAt: -1 };

  // 집계 파이프라인로 목록 + 계산필드(attachmentsCount/hasAttachments) 생성
  const pipeline = [
    { $match: filter },
    { $sort: sort },
    { $skip: (page - 1) * limit },
    { $limit: limit },

    // attachments 배열 보정
    { $addFields: { attachmentsArr: { $ifNull: ['$attachments', []] } } },

    // 이미지 개수 계산
    {
      $addFields: {
        attachmentsCount: { $size: '$attachmentsArr' },
        imagesCount: {
          $size: {
            $filter: {
              input: '$attachmentsArr',
              as: 'a',
              cond: {
                $or: [{ $regexMatch: { input: { $ifNull: ['$$a.mime', ''] }, regex: /^image\// } }, { $regexMatch: { input: { $ifNull: ['$$a.url', ''] }, regex: /\.(png|jpe?g|gif|webp|bmp|svg)$/i } }],
              },
            },
          },
        },
      },
    },

    // 파일(비이미지) 개수/플래그 — 이미지 조건의 NOT으로 직접 계산
    {
      $addFields: {
        filesCount: {
          $size: {
            $filter: {
              input: '$attachmentsArr',
              as: 'a',
              cond: {
                $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$$a.mime', ''] }, regex: /^image\// } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$$a.url', ''] }, regex: /\.(png|jpe?g|gif|webp|bmp|svg)$/i } }] }],
              },
            },
          },
        },
        hasImage: { $gt: ['$imagesCount', 0] },
        hasFile: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$attachmentsArr',
                  as: 'a',
                  cond: {
                    $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$$a.mime', ''] }, regex: /^image\// } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$$a.url', ''] }, regex: /\.(png|jpe?g|gif|webp|bmp|svg)$/i } }] }],
                  },
                },
              },
            },
            0,
          ],
        },
      },
    },

    // 목록에서는 본문/첨부 내용은 제외(= 순수 exclusion 프로젝션)
    {
      $project: {
        content: 0,
        attachments: 0,
        attachmentsArr: 0,
      },
    },
  ];

  const items = await col.aggregate(pipeline).toArray();

  return NextResponse.json(
    { ok: true, items, total, page, limit },
    {
      headers: {
        // 브라우저 캐시는 짧게(or 없음), CDN은 30초, 그리고 SWR 60초
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
        'Vercel-CDN-Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}

/* ---------------------------------- POST --------------------------------- */
export async function POST(req: NextRequest) {
  // 인증
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // 입력 검증
  const bodyRaw = await req.json();
  const parsed = createSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // 권한: 공지는 관리자만, QnA는 로그인 유저면 가능
  if (body.type === 'notice' && payload.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // 표시명 결정: users.name -> users.nickname -> payload.name -> payload.nickname -> email local-part
  const db = await getDb();
  let displayName: string | undefined = undefined;
  try {
    if (payload?.sub) {
      const u = await db.collection('users').findOne({ _id: new ObjectId(String(payload.sub)) });
      // @ts-ignore - 런타임 안전
      displayName = u?.name ?? u?.nickname ?? undefined;
    }
  } catch (_) {}
  // @ts-ignore - 런타임 안전
  if (!displayName) displayName = payload?.name ?? payload?.nickname ?? payload?.email?.split('@')?.[0];

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
      return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
    }
  }

  const now = new Date();

  // 첨부 URL 화이트리스트 필터링
  const safeAttachments = Array.isArray(body.attachments) ? body.attachments.filter((a) => a?.url && isAllowedHttpUrl(a.url)) : [];

  // 본문 content 서버에서 정제
  const safeContent = sanitizeHtml(String(body.content ?? ''));

  const doc: BoardPost = {
    type: body.type,
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
  return NextResponse.json({ ok: true, id: r.insertedId.toString() });
}
