import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';

const ALLOWED = new Set(['public', 'hidden']);

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db } = guard;

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? '').trim();

  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const col = db.collection('community_posts');
  const r = await col.updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } });

  if (!r.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
