import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { appendAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin.guard';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    //  관리자 가드
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;
    const { db, admin } = guard;

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const olderThanDays = Number(body?.olderThanDays ?? 0); // 0 또는 NaN => 전체 삭제

    const filter: any = { userId: new ObjectId(id) };
    if (olderThanDays > 0 && Number.isFinite(olderThanDays)) {
      const threshold = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      filter.at = { $lt: threshold };
    }

    const r = await db.collection('user_sessions').deleteMany(filter);

    // 감사 로그(공용 유틸)
    await appendAudit(
      db,
      {
        type: 'sessions_cleanup',
        actorId: admin._id,
        targetId: new ObjectId(id),
        message: `olderThanDays=${Number.isFinite(olderThanDays) && olderThanDays > 0 ? olderThanDays : 0}`,
        diff: {
          olderThanDays: Number.isFinite(olderThanDays) ? olderThanDays : 0,
          deleted: r.deletedCount,
        },
      },
      req
    );

    return NextResponse.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    console.error('[admin/users/:id/sessions/cleanup] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
