import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function GET(_: Request, context: { params: { orderId: string } }) {
  try {
    const db = (await clientPromise).db();
    const { orderId } = context.params;

    // orderId를 ObjectId와 string 둘 다로 매칭 (DB에 혼재 가능성 대응)
    let oid: ObjectId | null = null;
    try {
      oid = new ObjectId(orderId);
    } catch {
      oid = null;
    }

    const matchOrderId = oid ? { $in: [oid, orderId] } : orderId;

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
