import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });

  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const doc = await db.collection('rental_orders').findOne({ _id });
  if (!doc) return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });

  const current = String(doc.status ?? 'pending');
  if (current === 'paid') return NextResponse.json({ ok: true, id });

  // pending 상태에서만 전이 허용
  const u = await db.collection('rental_orders').updateOne({ _id, status: 'pending' }, { $set: { status: 'paid', paidAt: new Date(), updatedAt: new Date() } });
  if (!u.matchedCount) {
    return NextResponse.json({ ok: false, message: `INVALID_STATE(${current})` }, { status: 409 });
  }
  return NextResponse.json({ ok: true, id });
}
