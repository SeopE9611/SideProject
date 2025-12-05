// app/api/community/posts/[id]/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';

// 로그인 유저 ID 가져오기
async function getAuthUserId() {
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload || !payload.sub) return null;

  return String(payload.sub);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  // 1) ID 형식 검증
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const postsCol = db.collection('community_posts');
  const likesCol = db.collection('community_likes');

  // postId + userId 조합은 한 번만 들어가도록 인덱스 (이미 있으면 에러 무시)
  likesCol.createIndex({ postId: 1, userId: 1 }, { unique: true }).catch(() => {});

  const _postId = new ObjectId(id);
  const _userId = new ObjectId(userId);

  // 2) 먼저 좋아요 존재 여부 확인
  const existed = await likesCol.findOne({ postId: _postId, userId: _userId });

  let liked: boolean;

  if (existed) {
    // 이미 좋아요 → 좋아요 취소
    await likesCol.deleteOne({ _id: existed._id });
    await postsCol.updateOne({ _id: _postId }, { $inc: { likes: -1 } });
    liked = false;
  } else {
    // 아직 안 눌렀으면 새로 추가
    await likesCol.insertOne({
      postId: _postId,
      userId: _userId,
      createdAt: new Date(),
    });
    await postsCol.updateOne({ _id: _postId }, { $inc: { likes: 1 } });
    liked = true;
  }

  // 3) 최종 likes 값을 다시 읽어와서 응답
  const post = (await postsCol.findOne({ _id: _postId })) as any | null;
  if (!post) {
    // 정말 글이 없을 때만 not_found
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const likesCount = post.likes ?? 0;

  logInfo({
    msg: 'community:like:toggle',
    status: 200,
    durationMs: stop(),
    extra: { id, userId, liked, likes: likesCount },
    ...meta,
  });

  return NextResponse.json({ ok: true, liked, likes: likesCount }, { status: 200 });
}
