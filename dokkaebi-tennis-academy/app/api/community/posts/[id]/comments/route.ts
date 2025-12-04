import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import type { CommunityComment } from '@/lib/types/community';

// -------------------------- 유틸: 인증/작성자 이름 ---------------------------

// posts/route.ts 에서 사용하던 것과 동일한 로직 복사
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

// 댓글 작성 요청 바디 스키마
const createCommentSchema = z.object({
  content: z.string().min(1, '댓글 내용을 입력해 주세요.').max(1000, '댓글은 1000자 이내로 입력해 주세요.'),
});

// GET 쿼리: page, limit (기본값 1페이지 20개)
function parseListQuery(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 20,
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

  const filter = {
    postId: new ObjectId(id),
    status: 'public' as const,
  };

  const skip = (page - 1) * limit;

  const [total, docs] = await Promise.all([
    commentsCol.countDocuments(filter),
    commentsCol
      .find(filter)
      .sort({ createdAt: 1 }) // 오래된 댓글부터
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const items: CommunityComment[] = docs.map((d: any) => ({
    id: String(d._id),
    postId: d.postId instanceof ObjectId ? d.postId.toString() : String(d.postId),
    userId: d.userId ? String(d.userId) : null,
    nickname: d.nickname ?? '회원',
    authorName: d.authorName,
    authorEmail: d.authorEmail,
    content: d.content ?? '',
    status: d.status ?? 'public',
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt ? String(d.updatedAt) : undefined,
  }));

  // logInfo({
  //   msg: 'community:comments:list',
  //   status: 200,
  //   durationMs: stop(),
  //   extra: { postId: id, total, page, limit },
  //   ...meta,
  // });

  return NextResponse.json(
    {
      ok: true,
      items,
      total,
      page,
      limit,
    },
    {
      // 캐시 방지 (댓글은 실시간성이 중요하므로)
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
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

  const bodyRaw = await req.json();
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

  // 실제로 해당 게시글이 존재하는지 한 번 체크 (선택이지만 안전)
  const post = await postsCol.findOne({ _id: postObjectId, status: { $ne: 'deleted' } });
  if (!post) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const displayName = await resolveDisplayName(payload);
  const now = new Date();

  const doc = {
    postId: postObjectId,
    userId: new ObjectId(String(payload.sub)),
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
    }
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
    }
  );
}
