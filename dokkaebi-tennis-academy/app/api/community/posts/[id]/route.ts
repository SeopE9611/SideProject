import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import { verifyCommunityCsrf } from '@/lib/community/security';
import type { CommunityBoardType, CommunityPost } from '@/lib/types/community';
import { COMMUNITY_BOARD_TYPES, COMMUNITY_CATEGORIES } from '@/lib/types/community';
import { verifyAccessToken } from '@/lib/auth.utils';
import { normalizeSanitizedContent, sanitizeHtml, validateSanitizedLength } from '@/lib/sanitize';
import { validateBoardAssetUrl } from '@/lib/boards-community-url-policy';
import { classifyBoardPatchFailure } from '@/lib/boards-patch-conflict';

// ---------------------------------------------------------------------------
// GET: 게시글 상세
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  const db = await getDb();
  const col = db.collection('community_posts');

  // id 해석: ObjectId 우선, 아니면 숫자(postNo) 시도
  let doc: any | null = null;
  let postObjectId: ObjectId | null = null;

  if (ObjectId.isValid(id)) {
    // URL 파라미터가 ObjectId 형식이면 기존 방식 유지
    postObjectId = new ObjectId(id);
    doc = (await col.findOne({ _id: postObjectId })) as any | null;
  } else {
    // ObjectId가 아니면 "숫자 문자열(postNo)"인지 확인 → (type + postNo)로 조회
    const postNo = Number(id);

    if (!Number.isInteger(postNo)) {
      // 숫자로도 해석이 안 되면 아예 잘못된 URL → 404
      logInfo({
        msg: 'community:detail:invalid_id',
        status: 404,
        durationMs: stop(),
        extra: { id },
        ...meta,
      });

      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    // 어떤 게시판의 postNo인지 결정
    // - /board/free: 기존처럼 type 쿼리를 보내지 않아도 되도록 기본값은 free 유지
    // - /board/market, /board/gear: 프론트에서 ?type=market|gear 를 붙여서 조회
    const url = new URL(req.url);
    const rawType = url.searchParams.get('type');

    const typeParam = rawType && (COMMUNITY_BOARD_TYPES as readonly string[]).includes(rawType) ? (rawType as CommunityBoardType) : null;

    const resolvedType: CommunityBoardType = typeParam ?? 'free';

    // 게시판(type) + 글번호(postNo)로 조회
    doc = (await col.findOne({ type: resolvedType, postNo })) as any | null;

    // 조회에 성공하면 doc._id를 이후 공통 처리에서 사용
    if (doc && doc._id instanceof ObjectId) {
      postObjectId = doc._id;
    }
  }

  // 문서가 없거나 _id를 얻지 못한 경우
  if (!doc || !postObjectId) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 숨김 글 접근 제어: 관리자/작성자만 조회 허용
  if ((doc.status ?? 'public') === 'hidden') {
    const jar = await cookies();
    const token = jar.get('accessToken')?.value;

    // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500이 아니라 "비로그인" 취급
    let payload: any = null;
    try {
      payload = token ? verifyAccessToken(token) : null;
    } catch {
      payload = null;
    }

    const isAdmin = payload?.role === 'admin';
    const isOwner = payload?.sub && doc.userId && String(payload.sub) === String(doc.userId);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
  }

  // 로그인 사용자가 이미 좋아요를 눌렀는지 여부 계산
  let likedByMe = false;
  const userId = await getAuthUserId();

  if (userId) {
    const likesCol = db.collection('community_likes');
    const likeDoc = await likesCol.findOne({
      // 항상 실제 문서의 _id를 postId로 사용
      postId: postObjectId,
      userId: new ObjectId(userId),
    });

    likedByMe = !!likeDoc;
  }

  const item: CommunityPost = {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    content: doc.content,
    brand: doc.brand ?? null,

    userId: doc.userId ? String(doc.userId) : null,

    // 자유 게시판 카테고리/이미지/번호
    category: doc.category ?? null,
    images: Array.isArray(doc.images) ? doc.images : [],
    attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
    postNo: typeof doc.postNo === 'number' ? doc.postNo : null,

    nickname: doc.nickname ?? '회원',
    status: doc.status ?? 'public',

    // GET에서는 조회수 증가를 하지 않으므로, 저장된 값 그대로 반환
    views: doc.views ?? 0,
    likes: doc.likes ?? 0,
    likedByMe,
    commentsCount: doc.commentsCount ?? 0,

    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt ? String(doc.updatedAt) : undefined,
  };

  // logInfo({
  //   msg: 'community:detail',
  //   status: 200,
  //   durationMs: stop(),
  //   extra: { id: item.id, type: item.type },
  //   ...meta,
  // });

  return NextResponse.json({ ok: true, item });
}

// ---------------------------------------------------------------------------
// 공통: 인증 + 본인 글인지 체크
// ---------------------------------------------------------------------------

async function getAuthUserId() {
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;

  if (!token) return null;

  // verifyAccessToken throw 방어 + sub(ObjectId) 유효성 보장
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }

  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) return null;

  return subStr;
}

// ---------------------------------------------------------------------------
// PATCH: 게시글 수정 (제목 / 내용 / 카테고리 / 이미지)
// ---------------------------------------------------------------------------

const patchBodySchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    content: z.string().max(5000).optional(),
    category: z.enum(COMMUNITY_CATEGORIES).optional(),
    images: z.array(z.string()).max(20).optional(), // supabase URL 문자열 배열

    // 브랜드 게시판/중고거래 게시판
    brand: z.string().max(100).optional().nullable(),

    attachments: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
          size: z.number().optional(),
        }),
      )
      .optional(),
  })
  .refine((val) => val.title !== undefined || val.content !== undefined || val.category !== undefined || val.images !== undefined || val.attachments !== undefined || val.brand !== undefined, { message: '수정할 필드가 없습니다.' });

function findFirstInvalidAssetUrl(input: { images?: string[]; attachments?: Array<{ url: string }> }) {
  // 1) 이미지 URL 배열 검증: 첫 실패 인덱스를 반환해 클라이언트 보정 포인트를 명확히 제공
  if (Array.isArray(input.images)) {
    for (let i = 0; i < input.images.length; i += 1) {
      const validation = validateBoardAssetUrl(input.images[i]);
      if (!validation.ok) {
        return {
          path: ['images', i],
          reason: validation.reason,
          value: input.images[i],
        };
      }
    }
  }

  // 2) 첨부 URL 배열 검증: attachments[n].url 단위로 정책 강제
  if (Array.isArray(input.attachments)) {
    for (let i = 0; i < input.attachments.length; i += 1) {
      const validation = validateBoardAssetUrl(input.attachments[i]?.url);
      if (!validation.ok) {
        return {
          path: ['attachments', i, 'url'],
          reason: validation.reason,
          value: input.attachments[i]?.url,
        };
      }
    }
  }

  return null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {

  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const _id = new ObjectId(id);
  const db = await getDb();
  const col = db.collection('community_posts');

  const doc = (await col.findOne({ _id })) as any | null;
  if (!doc) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 작성자 본인인지 확인
  if (!doc.userId || String(doc.userId) !== userId) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'validation_error',
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const body = parsed.data;

  // 낙관적 동시성 제어를 위한 클라이언트 기준 시각 추출
  // - 헤더: If-Unmodified-Since
  // - 바디: clientSeenDate (권장), ifUnmodifiedSince (하위 호환)
  const ifUnmodifiedSinceHeader = req.headers.get('if-unmodified-since');
  const clientSeenDateBody = (json as any)?.clientSeenDate;
  const ifUnmodifiedSinceBody = (json as any)?.ifUnmodifiedSince;
  const clientSeenAtRaw = clientSeenDateBody ?? ifUnmodifiedSinceBody ?? ifUnmodifiedSinceHeader ?? null;

  let clientSeenDate: Date | null = null;
  if (typeof clientSeenAtRaw === 'string') {
    const d = new Date(clientSeenAtRaw);
    if (!Number.isNaN(d.getTime())) clientSeenDate = d;
  }

  // 정책 결정: community PATCH 역시 비허용 URL 발견 시 요청을 거부한다.
  // - 부분 저장/자동 필터 제거를 하지 않아 데이터 일관성을 유지
  const invalidAsset = findFirstInvalidAssetUrl(body);
  if (invalidAsset) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_attachment_url',
        message: '허용되지 않은 첨부 URL입니다. HTTPS + 허용 호스트/경로 정책을 확인해 주세요.',
        details: [{ path: invalidAsset.path, message: `허용되지 않은 URL(${invalidAsset.reason})`, value: invalidAsset.value }],
      },
      { status: 400 },
    );
  }

  let sanitizedContent: string | undefined;
  if (body.content !== undefined) {
    sanitizedContent = normalizeSanitizedContent(await sanitizeHtml(body.content));
    const contentLengthValidation = validateSanitizedLength(sanitizedContent, { min: 1, max: 5000 });

    if (contentLengthValidation === 'too_short') {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: [{ path: ['content'], message: '내용을 입력해 주세요.' }],
        },
        { status: 400 },
      );
    }

    if (contentLengthValidation === 'too_long') {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: [{ path: ['content'], message: '내용은 5000자 이내로 입력해 주세요.' }],
        },
        { status: 400 },
      );
    }
  }

  // market 게시판: 라켓/스트링은 brand 필수, 일반장비는 brand 제거(null)
  if (doc.type === 'market') {
    const nextCategory = body.category !== undefined ? (body.category as any) : (doc.category ?? null);
    const nextBrand = body.brand !== undefined ? body.brand : (doc.brand ?? null);

    const needBrand = nextCategory === 'racket' || nextCategory === 'string';
    const b = typeof nextBrand === 'string' ? nextBrand.trim() : '';

    if (needBrand && !b) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: [{ path: ['brand'], message: '라켓/스트링 글은 브랜드를 필수로 선택해 주세요.' }],
        },
        { status: 400 },
      );
    }
  }

  const update: any = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (sanitizedContent !== undefined) update.content = sanitizedContent;
  if (body.category !== undefined) update.category = body.category;

  // brand 업데이트(중고거래 게시판만)
  if (doc.type === 'market') {
    const nextCategory = body.category !== undefined ? (body.category as any) : (doc.category ?? null);
    const nextBrand = body.brand !== undefined ? body.brand : (doc.brand ?? null);

    const needBrand = nextCategory === 'racket' || nextCategory === 'string';

    if (!needBrand) {
      // 일반장비면 brand는 항상 null로 정리
      update.brand = null;
    } else {
      // racket/string이면 brand 유지(또는 갱신)
      update.brand = typeof nextBrand === 'string' ? nextBrand.trim() : null;
    }
  }

  if (body.images !== undefined) update.images = body.images;
  if (body.attachments !== undefined) update.attachments = body.attachments;

  update.updatedAt = new Date();

  const filter = clientSeenDate ? { _id, updatedAt: clientSeenDate } : { _id };
  const updatedResult = await col.updateOne(filter, { $set: update });

  if (!updatedResult.matchedCount) {
    const postStillExists = !!(await col.findOne({ _id }, { projection: { _id: 1 } }));
    const failure = classifyBoardPatchFailure({
      hasClientSeenDate: !!clientSeenDate,
      postStillExists,
    });

    if (failure === 'conflict') {
      return NextResponse.json({ ok: false, error: 'conflict' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// DELETE: 게시글 삭제 (작성자만 가능, 하드 삭제)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {

  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const _id = new ObjectId(id);
  const db = await getDb();
  const col = db.collection('community_posts');

  const doc = (await col.findOne({ _id })) as any | null;
  if (!doc) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 작성자 본인인지 확인
  if (!doc.userId || String(doc.userId) !== userId) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  await col.deleteOne({ _id });

  return NextResponse.json({ ok: true });
}
