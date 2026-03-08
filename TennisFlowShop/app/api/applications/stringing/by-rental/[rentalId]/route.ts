import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

/**
 * 목적: 라켓 대여(rental_orders) 기반 “draft 이어쓰기”를 지원
 * - 구매 플로우의 by-order 라우터와 동일한 계약(=draft만 찾는다)
 * - rentalId가 ObjectId/string으로 혼재할 수 있으므로 둘 다 매칭.
 */
export async function GET(_req: Request, context: { params: Promise<{ rentalId: string }> }) {
  try {
    const db = (await clientPromise).db();
    const { rentalId } = await context.params;

    if (!ObjectId.isValid(rentalId)) {
      return new NextResponse(JSON.stringify({ message: '유효하지 않은 대여 ID입니다.' }), {
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const rentalObjectId = new ObjectId(rentalId);
    const cookieStore = await cookies();
    const at = cookieStore.get('accessToken')?.value ?? null;

    let payload: any = null;
    try {
      payload = at ? verifyAccessToken(at) : null;
    } catch {
      payload = null;
    }

    const userSub = typeof payload?.sub === 'string' ? payload.sub : null;
    const isAdmin = payload?.role === 'admin';

    let rental: any = null;
    if (userSub && ObjectId.isValid(userSub)) {
      rental = await db
        .collection('rental_orders')
        .findOne({ _id: rentalObjectId, userId: new ObjectId(userSub) }, { projection: { _id: 1, userId: 1 } });
    }

    if (!rental && isAdmin) {
      rental = await db.collection('rental_orders').findOne({ _id: rentalObjectId }, { projection: { _id: 1, userId: 1 } });
    }

    if (!rental) {
      return new NextResponse(JSON.stringify({ found: false }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (!isAdmin && !(rental as any).userId) {
      // guest rental 검증 토큰 체계가 API 라우트에서 확정적으로 존재하지 않아 fail-closed
      return new NextResponse(JSON.stringify({ found: false }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const matchRentalId = { $in: [rentalObjectId, String(rentalObjectId)] };

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
  } catch (e) {
    console.error('[by-rental] GET error:', e);
    return new NextResponse(JSON.stringify({ message: '서버 오류' }), {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
