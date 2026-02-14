import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const db = await getDb();
    const userIdObj = new ObjectId(id);

    const orders = await db.collection('orders').countDocuments({ $or: [{ userId: userIdObj }, { userId: id }] });

    const applications = await db.collection('stringing_applications').countDocuments({ $or: [{ userId: userIdObj }, { userId: id }] });

    const reviews = await db.collection('reviews').countDocuments({ $or: [{ userId: userIdObj }, { userId: id }] });

    return NextResponse.json({ orders, applications, reviews }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/kpi] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
