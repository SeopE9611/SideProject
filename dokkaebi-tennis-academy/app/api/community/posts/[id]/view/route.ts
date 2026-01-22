import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/mongodb';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// 로그인 사용자 ID 추출 (accessToken → userId)
async function getAuthUserId() {
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

  // sub는 ObjectId 문자열이어야 함 (다른 라우터들과 동일한 기준으로 정리)
  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) return null;

  return subStr;
}

// 조회수 +1 전용 API
// POST /api/community/posts/:id/view
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const { id } = await ctx.params;

  const db = await getDb();
  const col = db.collection('community_posts');

  // ObjectId 유효성 체크
  if (!ObjectId.isValid(id)) {
    logInfo({
      msg: 'community:view:invalid_id',
      status: 404,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const _id = new ObjectId(id);

  // 글 존재 여부 확인
  const post = await col.findOne({ _id });
  if (!post) {
    logInfo({
      msg: 'community:view:not_found',
      status: 404,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 로그인 사용자 여부 확인
  const userId = await getAuthUserId();

  // 1) 비로그인 사용자: 그냥 무조건 +1 (클라이언트에서 localStorage로 1차 차단)
  if (!userId) {
    await col.updateOne({ _id }, { $inc: { views: 1 }, $set: { updatedAt: new Date() } });

    // 최신 조회수 다시 읽기
    const latest = await col.findOne({ _id });
    const views = (latest as any)?.views ?? (post as any)?.views ?? 0;

    logInfo({
      msg: 'community:view:guest',
      status: 200,
      durationMs: stop(),
      extra: { id, views },
      ...meta,
    });

    return NextResponse.json({ ok: true, views }, { status: 200 });
  }

  // 2) 로그인 사용자: userId 기준으로 중복 방지
  const viewsCol = db.collection('community_view_logs');

  // (postId, userId) 중복 기록 방지 인덱스(없으면 생성). like 라우트와 동일 패턴
  viewsCol.createIndex({ postId: 1, userId: 1 }, { unique: true }).catch(() => {});

  // userId는 문자열로 저장 (우리 users 컬렉션 id 타입과 맞추기)
  const viewUserId = String(userId);

  const existing = await viewsCol.findOne({
    postId: _id,
    userId: viewUserId,
  });

  if (existing) {
    // 이미 한 번 집계된 유저 → 조회수 증가 없이 현재 값만 반환
    const latest = await col.findOne({ _id });
    const views = (latest as any)?.views ?? (post as any)?.views ?? 0;

    logInfo({
      msg: 'community:view:member:duplicate',
      status: 200,
      durationMs: stop(),
      extra: { id, userId: viewUserId, views },
      ...meta,
    });

    return NextResponse.json({ ok: true, views, firstView: false }, { status: 200 });
  }

  // 아직 한 번도 조회 안한 유저 → 로그 기록 후 views +1
  try {
    await viewsCol.insertOne({
      postId: _id,
      userId: viewUserId,
      createdAt: new Date(),
    });
  } catch (e: any) {
    // 동시 요청 레이스로 인해 "이미 누가 먼저 insert" 한 경우(중복키)
    // → 조회수는 증가시키지 않고, 현재 값만 반환(duplicate branch와 동일 처리)
    if (e?.code === 11000) {
      const latest = await col.findOne({ _id });
      const views = (latest as any)?.views ?? (post as any)?.views ?? 0;

      logInfo({
        msg: 'community:view:member:duplicate_race',
        status: 200,
        durationMs: stop(),
        extra: { id, userId: viewUserId, views },
        ...meta,
      });

      return NextResponse.json({ ok: true, views, firstView: false }, { status: 200 });
    }
    throw e;
  }
  // 조회수 실제 증가
  const updated = await col.findOneAndUpdate(
    { _id },
    {
      $inc: { views: 1 },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  );

  if (!updated || !updated.value) {
    const fallbackViews = (post as any)?.views ?? 0;

    logInfo({
      msg: 'community:view:member:first:fallback',
      status: 200,
      durationMs: stop(),
      extra: { id, userId: viewUserId, views: fallbackViews },
      ...meta,
    });

    return NextResponse.json({ ok: true, views: fallbackViews, firstView: true }, { status: 200 });
  }

  const updatedDoc = updated.value as any;
  const views = updatedDoc?.views ?? (post as any)?.views ?? 0;

  logInfo({
    msg: 'community:view:member:first',
    status: 200,
    durationMs: stop(),
    extra: { id, userId: viewUserId, views },
    ...meta,
  });

  return NextResponse.json({ ok: true, views, firstView: true }, { status: 200 });
}
