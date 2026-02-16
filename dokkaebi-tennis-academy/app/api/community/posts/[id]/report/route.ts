import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';

function toEmailLocalPart(email?: string | null) {
  if (!email) return null;
  const [local] = String(email).split('@');
  return local?.trim() ? local.trim() : null;
}

async function resolveReporterNickname(db: Awaited<ReturnType<typeof getDb>>, payload: any) {
  const reporterUserId = String(payload?.sub ?? '');

  if (ObjectId.isValid(reporterUserId)) {
    const user = (await db.collection('users').findOne(
      { _id: new ObjectId(reporterUserId) },
      {
        projection: {
          nickname: 1,
          name: 1,
          email: 1,
        },
      },
    )) as { nickname?: string; name?: string; email?: string } | null;

    const userLabel = user?.nickname?.trim() || user?.name?.trim() || toEmailLocalPart(user?.email);
    if (userLabel) return userLabel;
  }

  return payload?.nickname?.trim() || payload?.name?.trim() || toEmailLocalPart(payload?.email) || '회원';
}

// 로그인된 사용자 정보 가져오기 (없으면 null)
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

  // sub는 ObjectId 문자열이어야 함 (신고자 식별/자기글 신고 차단/중복 신고 방지 로직 안정화)
  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) return null;

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
      { status: 400 },
    );
  }

  const { reason } = parsed.data as ReportInput;

  const db = await getDb();
  const postsCol = db.collection('community_posts');

  const _id = new ObjectId(id);

  // 3) 대상 게시글 존재 여부 확인 (삭제된 글은 신고 불가)
  const post = await postsCol.findOne({ _id, status: { $ne: 'deleted' } });

  if (!post) {
    // logInfo({
    //   msg: 'community:report:not_found',
    //   status: 404,
    //   durationMs: stop(),
    //   extra: { id },
    //   ...meta,
    // });

    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 4) 신고자 정보 (회원만 허용)
  const payload = await getAuthPayload();

  if (!payload) {
    // 비회원은 신고 불가
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // 여기까지 왔으면 인증된 사용자
  const reporterUserId = String(payload.sub);
  const reporterEmail = payload.email ? String(payload.email) : undefined;
  const reporterNickname = await resolveReporterNickname(db, payload);

  const reportsCol = db.collection('community_reports');

  // 자기글은 신고불가
  if (post.userId && String(post.userId) === reporterUserId) {
    return NextResponse.json({ ok: false, error: 'cannot_report_own_post' }, { status: 400 });
  }

  // 5)  중복 신고 방지 로직
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
    reporterNickname,
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
