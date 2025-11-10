import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { canTransitIdempotent } from '@/app/features/rentals/utils/status';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  //  관리자만 허용
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  if (payload?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id: rentalId } = await params;
  const db = (await clientPromise).db();

  if (!ObjectId.isValid(rentalId)) {
    return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  }

  const rental = await db.collection('rental_orders').findOne({ _id: new ObjectId(rentalId) });
  if (!rental) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 멱등성: 이미 반납된 건이면 그대로 성공
  if (rental.status === 'returned') {
    return NextResponse.json({ ok: true });
  }
  // 멱등 처리: 이미 returned면 OK
  if ((rental.status ?? 'created') === 'returned') {
    return NextResponse.json({ ok: true });
  }
  // 전이 가능성 선검사(가독)
  if (!canTransitIdempotent(rental.status ?? 'created', 'returned') || rental.status !== 'out') {
    return NextResponse.json({ ok: false, code: 'INVALID_STATE', message: '반납 불가 상태' }, { status: 409 });
  }
  // 원자적 전이: 현재 status가 'out'인 경우에만 'returned'
  const u = await db.collection('rental_orders').updateOne(
    { _id: new ObjectId(rentalId), status: 'out' }, // 상태 조건 포함
    { $set: { status: 'returned', returnedAt: new Date(), updatedAt: new Date() } }
  );
  if (u.matchedCount === 0) {
    return NextResponse.json({ ok: false, code: 'INVALID_STATE' }, { status: 409 });
  }

  await writeRentalHistory(db, rentalId, {
    action: 'returned',
    from: 'out',
    to: 'returned',
    actor: { role: 'admin', id: payload?.sub },
  });

  // 라켓 상태 available 로 복구
  if (rental.racketId) {
    const rack = await db.collection('used_rackets').findOne({ _id: new ObjectId(String(rental.racketId)) }, { projection: { quantity: 1 } });
    const qty = Number(rack?.quantity ?? 1);
    if (qty <= 1) {
      await db.collection('used_rackets').updateOne({ _id: new ObjectId(String(rental.racketId)) }, { $set: { status: 'available', updatedAt: new Date() } });
    }
  }

  return NextResponse.json({ ok: true });
}
