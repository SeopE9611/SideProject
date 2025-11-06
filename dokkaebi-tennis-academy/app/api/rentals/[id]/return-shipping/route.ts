import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // 로그인 검증
  const at = (await cookies()).get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // 파라미터/바디 검증
  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  const { courier = '', trackingNumber = '', shippedAt, note } = await req.json().catch(() => ({}));
  if (!courier || !trackingNumber) return NextResponse.json({ message: 'MISSING_FIELDS' }, { status: 400 });

  // 소유자 검증
  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const ownerId = new ObjectId(payload.sub);
  const mine = await db.collection('rental_orders').findOne({ _id, userId: ownerId });
  if (!mine) return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 });

  // 저장
  await db.collection('rental_orders').updateOne(
    { _id },
    {
      $set: {
        'shipping.return': {
          courier,
          trackingNumber,
          shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
          note: note || '',
        },
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}
