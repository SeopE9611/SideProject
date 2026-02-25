import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { requireAdmin } from '@/lib/admin.guard';
import type { AdminOutboxDetailResponseDto } from '@/types/admin/notifications';

const paramsSchema = z.object({ id: z.string().min(1) });

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { id } = paramsSchema.parse(await ctx.params);
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const doc = await db.collection('notifications_outbox').findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const payload: AdminOutboxDetailResponseDto = {
    ...(doc as Record<string, unknown>),
    id: doc._id.toString(),
    createdAt: toIso(doc.createdAt),
    sentAt: toIso(doc.sentAt),
    lastTriedAt: toIso((doc as Record<string, unknown>).lastTriedAt),
  };

  delete payload._id;
  return NextResponse.json(payload);
}
