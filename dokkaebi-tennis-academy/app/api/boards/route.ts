import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';
import type { BoardPost, BoardType, QnaCategory } from '@/lib/types/board';
import { ObjectId } from 'mongodb';

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

// category는 "코드 or 라벨" 모두 허용
const categorySchema = z.union([z.enum(QNA_CATEGORY_CODES as unknown as [string, ...string[]]), z.enum(QNA_CATEGORY_LABELS as unknown as [string, ...string[]])]).optional();

const createSchema = z.object({
  type: typeSchema,
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(2).max(20000),
  category: categorySchema, // qna에서만 사용
  productRef: productRefSchema,
  isSecret: z.boolean().optional(),
  isPinned: z.boolean().optional(), // notice에서만 사용
  attachments: z.array(z.object({ url: z.string().url(), name: z.string(), size: z.number().optional() })).optional(),
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

  // type 유효성 가드
  const type: BoardType | null = typeParam === 'notice' || typeParam === 'qna' ? (typeParam as BoardType) : null;

  const filter: any = { status: 'published' };
  if (type) filter.type = type;

  // 프론트에서 코드('product')를 보내도 DB에는 라벨('상품문의')로 저장되어 있으므로 정규화
  const normalized = normalizeCategory(rawCategory);
  if (normalized) {
    // normalized는 QnaCategory로 확정
    filter.category = normalized as QnaCategory;
  }

  if (productId) filter['productRef.productId'] = productId;

  // 목록에서는 비밀글이라도 제목/메타는 노출(본문/첨부는 상세에서 제한)
  const total = await db.collection('board_posts').countDocuments(filter);
  const items = await db
    .collection('board_posts')
    .find(filter)
    .project({ content: 0, attachments: 0 })
    .sort(type === 'notice' ? { isPinned: -1, createdAt: -1 } : { createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return NextResponse.json({ items, total, page, limit });
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
    normalizedCategory = norm ?? '일반문의'; // qna인데 없거나 이상하면 기본값
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

  const doc: BoardPost = {
    type: body.type,
    title: body.title,
    content: body.content,
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
