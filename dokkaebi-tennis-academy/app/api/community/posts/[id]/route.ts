import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import type { CommunityPost } from '@/lib/types/community';
import { COMMUNITY_CATEGORIES } from '@/lib/types/community';
import { verifyAccessToken } from '@/lib/auth.utils';

// ---------------------------------------------------------------------------
// GET: 게시글 상세 + 조회수 +1
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  const db = await getDb();
  const col = db.collection('community_posts');

  // id가 ObjectId 형식이 아니면 바로 404
  if (!ObjectId.isValid(id)) {
    logInfo({
      msg: 'community:detail:invalid_id',
      status: 404,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });

    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const _id = new ObjectId(id);

  // 문서 존재 여부 확인
  const doc = (await col.findOne({ _id })) as any | null;

  if (!doc) {
    // logInfo({
    //   msg: 'community:detail:not_found',
    //   status: 404,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });

    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 조회수 +1 (상세 조회는 이미 성공했으니 실패해도 치명적이지 않음)
  await col.updateOne({ _id }, { $inc: { views: 1 } });

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
    postNo: typeof doc.postNo === 'number' ? doc.postNo : null,

    nickname: doc.nickname ?? '회원',
    status: doc.status ?? 'public',

    // updateOne이 비동기라 응답엔 +1 된 값으로 보내기
    views: (doc.views ?? 0) + 1,
    likes: doc.likes ?? 0,
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

  const payload = verifyAccessToken(token);
  if (!payload || !payload.sub) return null;

  return String(payload.sub);
}

// ---------------------------------------------------------------------------
// PATCH: 게시글 수정 (제목 / 내용 / 카테고리 / 이미지)
// ---------------------------------------------------------------------------

const patchBodySchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    content: z.string().min(1).max(5000).optional(),
    category: z.enum(COMMUNITY_CATEGORIES).optional(),
    images: z.array(z.string()).max(20).optional(), // supabase URL 문자열 배열
  })
  .refine((val) => val.title !== undefined || val.content !== undefined || val.category !== undefined || val.images !== undefined, {
    message: '수정할 필드가 없습니다.',
  });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    // logInfo({
    //   msg: 'community:update:invalid_id',
    //   status: 404,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    // logInfo({
    //   msg: 'community:update:unauthorized',
    //   status: 401,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const _id = new ObjectId(id);
  const db = await getDb();
  const col = db.collection('community_posts');

  const doc = (await col.findOne({ _id })) as any | null;
  if (!doc) {
    // logInfo({
    //   msg: 'community:update:not_found',
    //   status: 404,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 작성자 본인인지 확인
  if (!doc.userId || String(doc.userId) !== userId) {
    // logInfo({
    //   msg: 'community:update:forbidden',
    //   status: 403,
    //   durationMs: stop(),
    //   extra: { id, userId },
    //   ...meta,
    // });
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
      { status: 400 }
    );
  }

  const body = parsed.data;

  const update: any = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.content !== undefined) update.content = body.content.trim();
  if (body.category !== undefined) update.category = body.category;
  if (body.images !== undefined) update.images = body.images;

  update.updatedAt = new Date();

  await col.updateOne({ _id }, { $set: update });

  // logInfo({
  //   msg: 'community:update:success',
  //   status: 200,
  //   durationMs: stop(),
  //   extra: { id, userId },
  //   ...meta,
  // });

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// DELETE: 게시글 삭제 (작성자만 가능, 하드 삭제)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    // logInfo({
    //   msg: 'community:delete:invalid_id',
    //   status: 404,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    // logInfo({
    //   msg: 'community:delete:unauthorized',
    //   status: 401,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const _id = new ObjectId(id);
  const db = await getDb();
  const col = db.collection('community_posts');

  const doc = (await col.findOne({ _id })) as any | null;
  if (!doc) {
    // logInfo({
    //   msg: 'community:delete:not_found',
    //   status: 404,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 작성자 본인인지 확인
  if (!doc.userId || String(doc.userId) !== userId) {
    // logInfo({
    //   msg: 'community:delete:forbidden',
    //   status: 403,
    //   durationMs: stop(),
    //   extra: { id, userId },
    //   ...meta,
    // });
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  await col.deleteOne({ _id });

  // logInfo({
  //   msg: 'community:delete:success',
  //   status: 200,
  //   durationMs: stop(),
  //   extra: { id, userId },
  //   ...meta,
  // });

  return NextResponse.json({ ok: true });
}
