import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!('ok' in guard) || !guard.ok) return guard.res;
  const db = guard.db;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });

  const doc = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) }, { projection: { refundAccount: 1 } });
  if (!doc?.refundAccount) return NextResponse.json({ message: 'NO_REFUND_ACCOUNT' }, { status: 404 });

  // 감사 로그
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
  await db.collection('rental_audits').insertOne({
    rentalId: id,
    type: 'REFUND_ACCOUNT_VIEW',
    adminId: guard.admin?._id ?? null,
    at: new Date(),
    ip,
  });

  return NextResponse.json({
    bank: doc.refundAccount.bank,
    holder: doc.refundAccount.holder,
    account: doc.refundAccount.account,
  });
}
