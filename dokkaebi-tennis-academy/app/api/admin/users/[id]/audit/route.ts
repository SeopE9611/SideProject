import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);
  return payload?.role === 'admin' && payload?.sub ? payload : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await requireAdmin();
    if (!payload) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 5, min: 1, max: 100 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const db = await getDb();
    await db.collection('user_audit_logs').createIndex({ userId: 1, at: -1 }, { name: 'audit_userId_at' });

    const userId = new ObjectId(id);
    const items = await db
      .collection('user_audit_logs')
      .find({ userId })
      .sort({ at: -1 })
      .limit(limit)
      .project({ _id: 0 }) // 깔끔하게 반환
      .toArray();

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/audit GET] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await requireAdmin();
    if (!payload) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { action, detail } = body || {};
    if (!action) return NextResponse.json({ message: 'action required' }, { status: 400 });

    const db = await getDb();
    await db.collection('user_audit_logs').createIndex({ userId: 1, at: -1 }, { name: 'audit_userId_at' });

    const byStr = String(payload.sub);
    if (!ObjectId.isValid(byStr)) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    const userId = new ObjectId(id);
    await db.collection('user_audit_logs').insertOne({
      userId,
      action,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail ?? {}),
      at: new Date(),
      by: new ObjectId(byStr),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/users/:id/audit POST] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
