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

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await requireAdmin();
    if (!payload) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 5)));
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
