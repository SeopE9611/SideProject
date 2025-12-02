import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/mongodb';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import type { CommunityPost } from '@/lib/types/community';

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
    logInfo({
      msg: 'community:detail:not_found',
      status: 404,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });

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
    nickname: doc.nickname ?? '회원',
    status: doc.status ?? 'public',
    // updateOne이 비동기라 응답엔 +1 된 값으로 보내기
    views: (doc.views ?? 0) + 1,
    likes: doc.likes ?? 0,
    commentsCount: doc.commentsCount ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt ? String(doc.updatedAt) : undefined,
  };

  logInfo({
    msg: 'community:detail',
    status: 200,
    durationMs: stop(),
    extra: { id: item.id, type: item.type },
    ...meta,
  });

  return NextResponse.json({ ok: true, item });
}
