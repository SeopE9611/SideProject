import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken, verifyOrderAccessToken } from '@/lib/auth.utils';

export async function GET(_req: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const db = (await clientPromise).db();
    const { orderId } = await context.params;

    if (!ObjectId.isValid(orderId)) {
      return new NextResponse(JSON.stringify({ message: '유효하지 않은 주문 ID입니다.' }), {
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const orderObjectId = new ObjectId(orderId);
    const order = await db.collection('orders').findOne({ _id: orderObjectId }, { projection: { _id: 1, userId: 1, guest: 1 } });
    if (!order) {
      return new NextResponse(JSON.stringify({ found: false }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const cookieStore = await cookies();
    const at = cookieStore.get('accessToken')?.value ?? null;
    const oax = cookieStore.get('orderAccessToken')?.value ?? null;

    let payload: any = null;
    try {
      payload = at ? verifyAccessToken(at) : null;
    } catch {
      payload = null;
    }

    let guestClaims: any = null;
    try {
      guestClaims = oax ? verifyOrderAccessToken(oax) : null;
    } catch {
      guestClaims = null;
    }

    const isOwner = !!(payload?.sub && order.userId && String(payload.sub) === String(order.userId));
    const isAdmin = payload?.role === 'admin';
    const isGuestOrder = !order.userId || (order as any).guest === true;
    const guestOwnsOrder = !!(isGuestOrder && guestClaims?.orderId && String(guestClaims.orderId) === String(order._id));

    if (!isOwner && !isAdmin && !guestOwnsOrder) {
      return new NextResponse(JSON.stringify({ found: false }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const matchOrderId = { $in: [orderObjectId, String(orderObjectId)] };

    // 이 라우터는 "draft 이어쓰기" 용도로만 사용한다.
    // - 같은 주문(orderId)에 draft 상태인 신청서가 있으면 그 ID를 반환
    // - 없으면 404(found: false) → 프론트는 새 신청으로 진행
    const rows = await db
      .collection('stringing_applications')
      .find(
        { orderId: matchOrderId, status: 'draft' }, // draft만 조회
        { projection: { _id: 1, status: 1, createdAt: 1 } }
      )
      .sort({ createdAt: -1 }) // 가장 최근 draft 우선
      .limit(1)
      .toArray();

    if (!rows || rows.length === 0) {
      return new NextResponse(JSON.stringify({ found: false }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const chosen = rows[0];

    return new NextResponse(
      JSON.stringify({
        found: true,
        applicationId: String(chosen._id),
        status: chosen.status ?? 'draft',
        location: `/services/applications/stringing/${String(chosen._id)}`,
      }),
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('[by-order] GET error:', e);
    return new NextResponse(JSON.stringify({ message: '서버 오류' }), {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
