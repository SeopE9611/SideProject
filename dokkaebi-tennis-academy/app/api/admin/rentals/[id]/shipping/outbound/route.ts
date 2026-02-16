import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 관리자 인증
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // 파라미터/바디 검증
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
  const { courier = '', trackingNumber = '', shippedAt } = await req.json().catch(() => ({}));
  if (!courier || !trackingNumber) return NextResponse.json({ ok: false, message: 'MISSING_FIELDS' }, { status: 400 });

  // 저장
  const db = (await clientPromise).db();
  await db.collection('rental_orders').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        'shipping.outbound': {
          courier,
          trackingNumber,
          shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
        },
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true });
}
