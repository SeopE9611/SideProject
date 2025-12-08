import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';

// 로그인된 사용자 정보 가져오기 (없으면 null)
async function getAuthPayload() {
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  if (!token) return null;

  const payload = verifyAccessToken(token);
  return payload ?? null;
}

// -------------------------- 신고 요청 스키마 -----------------------------

const reportSchema = z.object({
  reason: z.string().trim().min(10, '신고 사유는 최소 10자 이상이어야 합니다.').max(500, '신고 사유는 500자 이하로 입력해주세요.'),
});

type ReportInput = z.infer<typeof reportSchema>;

// -----------------------------------------------------------------------
// POST: 게시글 신고 생성
// -----------------------------------------------------------------------
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  // 1) ID 유효성 검사
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  // 2) 요청 본문 파싱 + Zod 검증
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'validation_failed',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { reason } = parsed.data as ReportInput;

  const db = await getDb();
  const postsCol = db.collection('community_posts');

  const _id = new ObjectId(id);

  // 3) 대상 게시글 존재 여부 확인 (삭제된 글은 신고 불가)
  const post = await postsCol.findOne({ _id, status: { $ne: 'deleted' } });

  if (!post) {
    logInfo({
      msg: 'community:report:not_found',
      status: 404,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });

    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 4) 신고자 정보 (회원/비회원 모두 허용)
  const payload = await getAuthPayload();

  const reporterUserId = payload?.sub ? String(payload.sub) : undefined;
  const reporterEmail = payload?.email ? String(payload.email) : undefined;

  const reportsCol = db.collection('community_reports');

  // 5) (선택) 간단한 중복 신고 방지 로직
  //   - 같은 회원이 같은 글을 5분 내에 여러 번 신고하는 것 차단
  if (reporterUserId) {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const recent = await reportsCol.findOne({
      postId: _id,
      reporterUserId,
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (recent) {
      return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });
    }
  }

  // 6) 신고 문서 생성
  const now = new Date();

  const doc = {
    postId: _id,
    // 게시판 종류: DB에서는 type 필드 사용 중 (free / brand)
    boardType: post.type ?? 'free',

    reason,

    reporterUserId: reporterUserId ?? null,
    reporterEmail: reporterEmail ?? null,

    status: 'pending' as const,
    createdAt: now,
    resolvedAt: null,
  };

  const result = await reportsCol.insertOne(doc as any);

  logInfo({
    msg: 'community:report:create',
    status: 201,
    durationMs: stop(),
    extra: {
      reportId: result.insertedId.toString(),
      postId: id,
      reporterUserId: reporterUserId ?? null,
    },
    ...meta,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
