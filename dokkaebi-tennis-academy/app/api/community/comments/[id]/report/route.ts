import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';

// 1) 인증 페이로드 유틸
async function getAuthPayload() {
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  if (!token) return null;

  const payload = verifyAccessToken(token);
  return payload ?? null;
}

// 2) 신고 사유 스키마
const reportSchema = z.object({
  reason: z.string().trim().min(10, '신고 사유는 최소 10자 이상이어야 합니다.').max(500, '신고 사유는 500자 이하로 입력해주세요.'),
});

type ReportInput = z.infer<typeof reportSchema>;

// -----------------------------------------------------------------------
// POST: 댓글/대댓글 신고 생성
// POST /api/community/comments/[id]/report
// -----------------------------------------------------------------------
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const { id } = await ctx.params;

  // 1) ID 유효성 검사
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  // 2) body 파싱 + Zod 검증
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'validation_failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { reason } = parsed.data as ReportInput;

  // 3) 댓글 존재 여부 확인 + 게시글 정보 가져오기
  const db = await getDb();
  const commentsCol = db.collection('community_comments');
  const postsCol = db.collection('community_posts');
  const reportsCol = db.collection('community_reports');

  const commentObjectId = new ObjectId(id);

  const comment = await commentsCol.findOne({ _id: commentObjectId });

  if (!comment || comment.status === 'deleted') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 이 댓글이 속한 게시글 정보 (게시판 타입 등)
  const post = await postsCol.findOne({ _id: comment.postId });
  if (!post) {
    return NextResponse.json({ ok: false, error: 'post_not_found' }, { status: 404 });
  }

  // 4) 신고자 정보 (회원만 허용)
  const payload = await getAuthPayload();
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const reporterUserId = String(payload.sub);
  const reporterEmail = payload.email ? String(payload.email) : undefined;

  // 자기 댓글은 신고 불가
  if (comment.userId && String(comment.userId) === reporterUserId) {
    return NextResponse.json({ ok: false, error: 'cannot_report_own_comment' }, { status: 400 });
  }

  // 5) 중복 신고(5분 이내) 방지
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const recent = await reportsCol.findOne({
    commentId: commentObjectId,
    reporterUserId,
    createdAt: { $gte: fiveMinutesAgo },
  });

  if (recent) {
    return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });
  }

  // 6) 신고 문서 생성
  const doc = {
    postId: comment.postId,
    commentId: commentObjectId,
    boardType: post.type ?? 'free',
    targetType: 'comment' as const,
    reason,
    reporterUserId: reporterUserId ?? null,
    reporterEmail: reporterEmail ?? null,
    status: 'pending' as const,
    createdAt: now,
    resolvedAt: null,
  };

  const result = await reportsCol.insertOne(doc as any);

  logInfo({
    msg: 'community:comment_report:create',
    status: 201,
    durationMs: stop(),
    extra: {
      reportId: result.insertedId.toString(),
      commentId: id,
      reporterUserId: reporterUserId ?? null,
    },
    ...meta,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
