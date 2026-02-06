import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import type { CommunityComment } from '@/lib/types/community';

// -------------------------- 유틸: 인증/작성자 이름 ---------------------------

async function getAuthPayload() {
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  if (!token) return null;
  // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500이 아니라 "비로그인" 처리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }
  // sub는 ObjectId 문자열이어야 함 (new ObjectId(payload.sub) 500 방지)
  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) return null;
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
    // getAuthPayload에서 sub(ObjectId) 유효성은 보장되지만, 방어적으로 한 번 더 체크
    if (payload?.sub && ObjectId.isValid(String(payload.sub))) {
      const u = await db.collection('users').findOne({
        _id: new ObjectId(String(payload.sub)),
      });

      // 현재 users 스키마 기준:
      // 1) (나중에 nickname 필드가 생기면) u.nickname
      // 2) u.name
      // 3) 그 외는 fallback
      const userDoc = u as { nickname?: string; name?: string } | null;
      displayName = userDoc?.nickname ?? userDoc?.name ?? null;
    }
  } catch {
    // 조회 실패해도 치명적이진 않으니 무시
  }

  // 아직도 못 정했으면 payload 기반 fallback
  if (!displayName) {
    displayName = payload?.nickname ?? payload?.name ?? payload?.email?.split('@')?.[0] ?? '회원';
  }

  return displayName ?? '회원';
}

// ----------------------------- Zod 스키마 ----------------------------------

// 댓글 작성 요청 바디 스키마
const createCommentSchema = z.object({
  content: z.string().min(1, '댓글 내용을 입력해 주세요.').max(1000, '댓글은 1000자 이내로 입력해 주세요.'),
  // 대댓글용 부모 댓글 ID (루트 댓글이면 생략/undefined)
  parentId: z.string().optional(),
});

// GET 쿼리: page, limit (기본값 1페이지 20개)
function parseListQuery(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const pageRaw = Number(searchParams.get('page') ?? '1');
  const limitRaw = Number(searchParams.get('limit') ?? '20');
  // Mongo skip/limit는 정수여야 안전. (소수/NaN 방지)
  const pageInt = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
  const limitInt = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.trunc(limitRaw) : 20;

  return {
    page: Math.min(10_000, Math.max(1, pageInt)),
    limit: Math.min(100, Math.max(1, limitInt)),
  };
}

// ----------------------------- GET: 댓글 목록 -------------------------------

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const { page, limit } = parseListQuery(req);
  const db = await getDb();
  const commentsCol = db.collection('community_comments');

  const postObjectId = new ObjectId(id);

  // 기본 필터: 이 글의 'public' 댓글 전체
  const baseFilter = {
    postId: postObjectId,
    status: 'public' as const,
  };

  // 0) 화면에 실제로 보여줄 댓글 전체(루트 + 대댓글, public + deleted)
  const visibleFilter = {
    postId: postObjectId,
    status: { $in: ['public', 'deleted'] as const },
  };

  // 전체 댓글 수(루트 + 대댓글)를 total로 내려줌 → 상단 "댓글 N" 표시용
  const total = await commentsCol.countDocuments(visibleFilter);

  // 1) 페이지네이션 기준은 "루트 댓글(parentId: null)"만 사용
  //    → deleted도 보여주므로 상태는 동일하게 맞춰줌
  const rootFilter = {
    ...visibleFilter,
    parentId: null,
  };

  // 루트 댓글 수: 실제 페이지 수 계산용
  const rootTotal = await commentsCol.countDocuments(rootFilter);

  const skip = (page - 1) * limit;

  const rootDocs = await commentsCol.find(rootFilter).sort({ createdAt: 1 }).skip(skip).limit(limit).toArray();

  const rootIds = rootDocs.map((d: any) => d._id);

  // 2) 해당 루트 댓글들의 대댓글 로딩 (public + deleted)
  const replyDocs =
    rootIds.length > 0
      ? await commentsCol
          .find({
            postId: postObjectId,
            parentId: { $in: rootIds },
            status: { $in: ['public', 'deleted'] as const },
          })
          .sort({ createdAt: 1 })
          .toArray()
      : [];

  const docs = [...rootDocs, ...replyDocs];
  const items: CommunityComment[] = docs.map((d: any) => ({
    id: String(d._id),
    postId: d.postId instanceof ObjectId ? d.postId.toString() : String(d.postId),
    parentId: d.parentId instanceof ObjectId ? d.parentId.toString() : d.parentId ? String(d.parentId) : null,
    userId: d.userId ? String(d.userId) : null,
    nickname: d.nickname ?? '회원',
    authorName: d.authorName,
    authorEmail: d.authorEmail,
    content: d.content ?? '',
    status: d.status ?? 'public',
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt ? String(d.updatedAt) : undefined,
  }));

  return NextResponse.json(
    {
      ok: true,
      items,
      total,
      rootTotal,
      page,
      limit,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}

// ----------------------------- POST: 댓글 작성 ------------------------------

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const payload = await getAuthPayload();
  if (!payload) {
    // logInfo({
    //   msg: 'community:comments:create:unauthorized',
    //   status: 401,
    //   durationMs: stop(),
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // 작성자 ObjectId 변환은 throw 가능하므로, 방어적으로 한 번 더 체크 후 재사용
  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const userId = new ObjectId(subStr);

  // 깨진 JSON이면 throw → 500 방지 (400으로 정리)
  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = createCommentSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    // logInfo({
    //   msg: 'community:comments:create:validation_failed',
    //   status: 400,
    //   durationMs: stop(),
    //   extra: { issues: parsed.error.issues },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'validation_error', details: parsed.error.issues }, { status: 400 });
  }

  const body = parsed.data;
  const db = await getDb();
  const commentsCol = db.collection('community_comments');
  const postsCol = db.collection('community_posts');

  const postObjectId = new ObjectId(id);

  // 실제로 해당 게시글이 존재하는지 체크
  const post = await postsCol.findOne({ _id: postObjectId, status: { $ne: 'deleted' } });
  if (!post) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // parentId가 넘어온 경우: 같은 글에 속한 유효한 댓글인지 검증
  let parentObjectId: ObjectId | null = null;
  if (body.parentId) {
    if (!ObjectId.isValid(body.parentId)) {
      return NextResponse.json({ ok: false, error: 'invalid_parent_id' }, { status: 400 });
    }

    parentObjectId = new ObjectId(body.parentId);

    const parentComment = await commentsCol.findOne({
      _id: parentObjectId,
      postId: postObjectId,
      status: { $ne: 'deleted' },
    });

    if (!parentComment) {
      return NextResponse.json({ ok: false, error: 'parent_not_found' }, { status: 400 });
    }
  }

  const displayName = await resolveDisplayName(payload);
  const now = new Date();

  const doc = {
    postId: postObjectId,
    parentId: parentObjectId, // 루트 댓글이면 null, 대댓글이면 부모 댓글 ObjectId
    userId,
    nickname: displayName,
    content: body.content,
    status: 'public' as const,
    createdAt: now,
    updatedAt: now,
  };

  const r = await commentsCol.insertOne(doc as any);

  // 댓글 수 카운터 증가
  await postsCol.updateOne(
    { _id: postObjectId },
    {
      $inc: { commentsCount: 1 },
      $set: { updatedAt: new Date() },
    },
  );

  // logInfo({
  //   msg: 'community:comments:create:success',
  //   status: 201,
  //   durationMs: stop(),
  //   extra: { id: r.insertedId.toString(), postId: id },
  //   ...meta,
  // });

  return NextResponse.json(
    { ok: true, id: r.insertedId.toString() },
    {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
