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

    // 취소는 제외하고 최근 것들만 몇 개 가져온 뒤, draft가 아니면 우선 선택
    const rows = await db
      .collection('stringing_applications')
      .find({ orderId: matchOrderId, status: { $ne: '취소' } }, { projection: { _id: 1, status: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    if (!rows || rows.length === 0) {
      return new NextResponse(JSON.stringify({ found: false }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    // draft가 아닌 문서를 우선 선택(검토 중/접수완료/작업 중 등)
    const nonDraft = rows.find((r: any) => r.status && r.status !== 'draft');
    const chosen = nonDraft ?? rows[0];

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
