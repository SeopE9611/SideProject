// app/api/community/posts/[id]/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoServerError, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import { COMMUNITY_RATE_LIMIT_POLICIES, enforceCommunityRateLimit, verifyCommunityCsrf } from '@/lib/community/security';

// 로그인 유저 ID 가져오기
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

  const subStr = payload?.sub ? String(payload.sub) : '';
  // sub는 ObjectId 문자열이어야 함 (new ObjectId(userId)에서 500 방지)
  if (!subStr || !ObjectId.isValid(subStr)) return null;

  return subStr;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    logInfo({
      msg: 'community:like:csrf_failed',
      status: 403,
      durationMs: stop(),
      extra: { reason: csrf.code },
      ...meta,
    });
    return csrf.response;
  }

  const { id } = await ctx.params;

  // 1) ID 형식 검증
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const rateLimit = await enforceCommunityRateLimit({
    req,
    policy: COMMUNITY_RATE_LIMIT_POLICIES.community_like,
    userId,
  });
  if (!rateLimit.ok) {
    logInfo({
      msg: 'community:like:rate_limited',
      status: 429,
      durationMs: stop(),
      extra: { userId, scope: rateLimit.scope },
      ...meta,
    });
    return rateLimit.response;
  }

  const db = await getDb();
  const postsCol = db.collection('community_posts');
  const likesCol = db.collection('community_likes');

  const _postId = new ObjectId(id);
  const _userId = new ObjectId(userId);

  // 2) 게시글 존재 검증 (없으면 좋아요 문서/카운트가 오염되면 안 됨)
  const exists = await postsCol.findOne({ _id: _postId }, { projection: { _id: 1 } });
  if (!exists) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  let liked = false;
  let likesCount = 0;

  try {
    // 신규 좋아요 시도 (성공하면 liked=true 경로)
    await likesCol.insertOne({
      postId: _postId,
      userId: _userId,
      createdAt: new Date(),
    });

    liked = true;
    const incResult = await postsCol.findOneAndUpdate(
      { _id: _postId },
      [
        {
          $set: {
            likes: { $add: [{ $ifNull: ['$likes', 0] }, 1] },
          },
        },
      ],
      { returnDocument: 'after', projection: { likes: 1 } },
    );

    if (!incResult) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    likesCount = Math.max(0, Number(incResult.likes ?? 0));
  } catch (error) {
    // 중복키면 이미 liked=true 상태였던 것으로 보고 취소(unlike) 경로로 처리
    if (!(error instanceof MongoServerError) || error.code !== 11000) {
      throw error;
    }

    liked = false;
    const deleteResult = await likesCol.deleteOne({ postId: _postId, userId: _userId });

    if (deleteResult.deletedCount > 0) {
      const decResult = await postsCol.findOneAndUpdate(
        { _id: _postId },
        [
          {
            $set: {
              likes: {
                $max: [0, { $subtract: [{ $ifNull: ['$likes', 0] }, 1] }],
              },
            },
          },
        ],
        { returnDocument: 'after', projection: { likes: 1 } },
      );

      if (!decResult) {
        return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
      }

      likesCount = Math.max(0, Number(decResult.likes ?? 0));
    } else {
      const post = await postsCol.findOne({ _id: _postId }, { projection: { likes: 1 } });
      if (!post) {
        return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
      }
      likesCount = Math.max(0, Number(post.likes ?? 0));
    }
  }

  logInfo({
    msg: 'community:like:toggle',
    status: 200,
    durationMs: stop(),
    extra: { id, userId, liked, likes: likesCount },
    ...meta,
  });

  return NextResponse.json({ ok: true, liked, likes: likesCount }, { status: 200 });
}
