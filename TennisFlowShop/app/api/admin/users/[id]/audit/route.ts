import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;

    const url = new URL(req.url);
    const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 5, min: 1, max: 100 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const db = await getDb();

    const userId = new ObjectId(id);
    const items = await db.collection('user_audit_logs').find({ userId }).sort({ at: -1 }).limit(limit).project({ _id: 0 }).toArray();

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/audit GET] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { action, detail } = body || {};
    if (!action) return NextResponse.json({ message: 'action required' }, { status: 400 });

    const db = await getDb();

    const userId = new ObjectId(id);
    await db.collection('user_audit_logs').insertOne({
      userId,
      action,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail ?? {}),
      at: new Date(),
      by: guard.admin._id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/users/:id/audit POST] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
