import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { dispatchOutbox } from '@/app/features/notifications/core/dispatch';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // --- 관리자 인증 (공용 가드) ---
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
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

  if (doc?.status !== 'queued') {
    return NextResponse.json({ error: `status=${String(doc?.status)} 항목은 강제 발송할 수 없습니다.` }, { status: 400 });
  }

  if (!doc?.rendered) return NextResponse.json({ error: 'rendered payload가 없어 강제 발송할 수 없습니다.' }, { status: 400 });

  // 강제 발송 = retries     즉시 dispatch 수행
  await coll.updateOne(
    { _id },
    {
      $inc: { retries: 1 },
      $set: { error: null, lastTriedAt: new Date() },
    }
  );

  await dispatchOutbox(_id, doc.rendered, Array.isArray(doc.channels) ? doc.channels : []);

  return NextResponse.json({ ok: true });
}
