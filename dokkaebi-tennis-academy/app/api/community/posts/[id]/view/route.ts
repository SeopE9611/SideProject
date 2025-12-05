// app/api/community/posts/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/mongodb';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';

// 조회수 +1 전용 API
// POST /api/community/posts/:id/view
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);

  const { id } = await ctx.params;

  // 1) ObjectId 유효성 검사
  if (!ObjectId.isValid(id)) {
    logInfo({
      msg: 'community:view:invalid_id',
      status: 400,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });

    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const _id = new ObjectId(id);
  const db = await getDb();
  const col = db.collection('community_posts');

  // 2) 조회수 +1 시도
  //    여기서 value 를 못 받아오는 특이 케이스가 있어서,
  //    실패 시에는 한 번 더 findOne 으로 확인해 준다.
  const updateResult = await col.findOneAndUpdate(
    { _id },
    {
      $inc: { views: 1 },
      $set: { updatedAt: new Date() },
    },
    {
      returnDocument: 'after',
    }
  );

  let doc = updateResult?.value as any | null;

  // 3) 혹시 value 가 비어 있으면, 존재 여부를 다시 한 번 확인
  if (!doc) {
    doc = (await col.findOne({ _id })) as any | null;
    if (!doc) {
      logInfo({
        msg: 'community:view:not_found',
        status: 404,
        durationMs: stop(),
        extra: { id },
        ...meta,
      });

      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
  }

  const views = doc.views ?? 0;

  logInfo({
    msg: 'community:view:success',
    status: 200,
    durationMs: stop(),
    extra: { id, views },
    ...meta,
  });

  return NextResponse.json({ ok: true, views }, { status: 200 });
}
