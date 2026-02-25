// app/api/community/comments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { normalizeSanitizedContent, sanitizeHtml, validateSanitizedLength } from '@/lib/sanitize';
import { verifyCommunityCsrf } from '@/lib/community/security';

// 공통: 인증 페이로드
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

  // sub는 ObjectId 문자열이어야 함 (권한 비교/추후 ObjectId 사용 시 500 방지)
  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) return null;

  return payload ?? null;
}

// PATCH 바디 스키마
const updateCommentSchema = z.object({
  // 공백만 입력되는 케이스 방지
  content: z.string().max(1000, '댓글은 1000자 이내로 입력해 주세요.'),
});

// --------------------------- PATCH: 댓글 수정 ---------------------------

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {

  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const payload = await getAuthPayload();
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const commentsCol = db.collection('community_comments');

  const commentObjectId = new ObjectId(id);

  // 기존 댓글 조회
  const existing = await commentsCol.findOne({ _id: commentObjectId });

  if (!existing || existing.status === 'deleted') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 작성자 본인인지 확인
  if (!existing.userId || String(existing.userId) !== String(payload.sub)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // 깨진 JSON이면 throw → 500 방지 (400으로 정리)
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = updateCommentSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'validation_error', details: parsed.error.issues }, { status: 400 });
  }

  const sanitizedContent = normalizeSanitizedContent(await sanitizeHtml(parsed.data.content));
  const contentLengthValidation = validateSanitizedLength(sanitizedContent, { min: 1, max: 1000 });

  if (contentLengthValidation === 'too_short') {
    return NextResponse.json(
      { ok: false, error: 'validation_error', details: [{ path: ['content'], message: '댓글 내용을 입력해 주세요.' }] },
      { status: 400 },
    );
  }

  if (contentLengthValidation === 'too_long') {
    return NextResponse.json(
      { ok: false, error: 'validation_error', details: [{ path: ['content'], message: '댓글은 1000자 이내로 입력해 주세요.' }] },
      { status: 400 },
    );
  }

  await commentsCol.updateOne(
    { _id: commentObjectId },
    {
      $set: {
        content: sanitizedContent,
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}

// --------------------------- DELETE: 댓글 삭제 ---------------------------

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {

  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const payload = await getAuthPayload();
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const commentsCol = db.collection('community_comments');
  const postsCol = db.collection('community_posts');

  const commentObjectId = new ObjectId(id);

  const existing = await commentsCol.findOne({ _id: commentObjectId });

  if (!existing || existing.status === 'deleted') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 작성자 본인인지 확인
  if (!existing.userId || String(existing.userId) !== String(payload.sub)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // 소프트 삭제 + 댓글 수 감소
  await commentsCol.updateOne(
    { _id: commentObjectId },
    {
      $set: {
        status: 'deleted' as const,
        updatedAt: new Date(),
      },
    },
  );

  if (existing.postId) {
    await postsCol.updateOne(
      { _id: existing.postId },
      {
        $inc: { commentsCount: -1 },
        $set: { updatedAt: new Date() },
      },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
