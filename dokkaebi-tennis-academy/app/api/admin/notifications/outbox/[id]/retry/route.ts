import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { requireAdmin } from '@/lib/admin.guard';
import { dispatchOutbox } from '@/app/features/notifications/core/dispatch';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // --- 관리자 인증 (공용 가드) ---
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const _id = new ObjectId(id);
  const coll = db.collection('notifications_outbox');

  const doc = await coll.findOne(
    { _id },
    {
      projection: {
        status: 1,
        channels: 1,
        rendered: 1,
      },
    }
  );

  if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  if (!doc?.rendered) return NextResponse.json({ error: 'rendered payload가 없어 재시도할 수 없습니다.' }, { status: 400 });

  // 재시도 = retries++ + 상태를 queued로 되돌린 뒤, 즉시 dispatch 수행
  await coll.updateOne(
    { _id },
    {
      $inc: { retries: 1 },
      $set: { status: 'queued', error: null, lastTriedAt: new Date() },
      $unset: { sentAt: '' },
    }
  );

  await dispatchOutbox(_id, doc.rendered, Array.isArray(doc.channels) ? doc.channels : []);

  return NextResponse.json({ ok: true });
}
