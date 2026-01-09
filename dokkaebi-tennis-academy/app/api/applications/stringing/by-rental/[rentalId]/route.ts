import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

/**
 * 목적: 라켓 대여(rental_orders) 기반 “draft 이어쓰기”를 지원
 * - 구매 플로우의 by-order 라우터와 동일한 계약(=draft만 찾는다)
 * - rentalId가 ObjectId/string으로 혼재할 수 있으므로 둘 다 매칭.
 */
export async function GET(_req: Request, context: { params: Promise<{ rentalId: string }> }) {
  const db = (await clientPromise).db();
  const { rentalId } = await context.params;

  let oid: ObjectId | null = null;
  try {
    oid = new ObjectId(rentalId);
  } catch {
    oid = null;
  }

  const matchRentalId = oid ? { $in: [oid, rentalId] } : rentalId;

  const rows = await db
    .collection('stringing_applications')
    .find({ rentalId: matchRentalId, status: 'draft' }, { projection: { _id: 1, status: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

  if (!rows?.length) {
    return new NextResponse(JSON.stringify({ found: false }), { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  return new NextResponse(
    JSON.stringify({
      found: true,
      applicationId: String(rows[0]._id),
      status: rows[0].status ?? 'draft',
      location: `/services/applications/stringing/${String(rows[0]._id)}`,
    }),
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
