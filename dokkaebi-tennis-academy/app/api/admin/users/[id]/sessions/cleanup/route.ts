import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  return payload?.role === 'admin' ? payload : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const olderThanDays = Number(body?.olderThanDays ?? 0); // 0 또는 NaN => 전체 삭제
    const db = await getDb();

    const filter: any = { userId: new ObjectId(id) };
    if (olderThanDays > 0 && Number.isFinite(olderThanDays)) {
      const threshold = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      filter.at = { $lt: threshold };
    }

    const r = await db.collection('user_sessions').deleteMany(filter);

    // 감사 로그 남기기
    await db
      .collection('user_audit_logs')
      .createIndex({ userId: 1, at: -1 })
      .catch((e: any) => {
        if (e?.code !== 85) throw e;
      });
    await db.collection('user_audit_logs').insertOne({
      userId: new ObjectId(id),
      action: '세션 로그 정리',
      detail: JSON.stringify({ olderThanDays: Number.isFinite(olderThanDays) ? olderThanDays : 0, deleted: r.deletedCount }),
      at: new Date(),
      by: new ObjectId(String(admin.sub)),
    });

    return NextResponse.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    console.error('[admin/users/:id/sessions/cleanup] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
