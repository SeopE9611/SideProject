import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

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
    const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 5, min: 1, max: 50 });
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const db = await getDb();
    const userIdObj = new ObjectId(id);
    const filter = { $or: [{ userId: userIdObj }, { userId: id }] };

    await db.collection('orders').createIndex({ userId: 1, createdAt: -1 }, { name: 'orders_userId_createdAt' });

    const col = db.collection('orders');
    const total = await col.countDocuments(filter);
    const items = await col
      .find(filter, { projection: { _id: 1, status: 1, totalPrice: 1, createdAt: 1, number: 1 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ items, total }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/orders] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
