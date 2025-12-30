import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';

function toIso(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const doc = await db.collection('notifications_outbox').findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const payload: any = { ...doc, id: doc._id.toString() };
  delete payload._id;

  payload.createdAt = toIso(doc?.createdAt);
  payload.sentAt = toIso(doc?.sentAt);
  payload.lastTriedAt = toIso((doc as any)?.lastTriedAt);

  return NextResponse.json(payload);
}
