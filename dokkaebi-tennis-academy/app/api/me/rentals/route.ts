import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1) 인증
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;

  // 토큰 파싱 방어 (없거나, 손상된 토큰이면 401)
  if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  let payload: any = null;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = new ObjectId(payload.sub);

  // 2) 페이지네이션 파라미터
  const url = new URL(req.url);
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '20', 10), 1), 50);
  const skip = (page - 1) * pageSize;

  // 3) 조회
  const db = (await clientPromise).db();
  const [items, total] = await Promise.all([db.collection('rental_orders').find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(), db.collection('rental_orders').countDocuments({ userId })]);

  // 4) 응답 평탄화
  const rows = items.map((d) => {
    const ret = d?.shipping?.return;
    const tracking = ret?.trackingNumber || '';
    return {
      id: d._id.toString(),
      brand: d.brand,
      model: d.model,
      days: d.days,
      status: d.status, // created | paid | out | returned
      amount: d.amount, // { fee, deposit, total }
      createdAt: d.createdAt,
      dueAt: d.dueAt,
      hasReturnShipping: Boolean(tracking),
      returnShippingBrief: tracking ? { courier: ret?.courier || '', trackingLast4: String(tracking).slice(-4) } : null,
      cancelStatus: d.cancelRequest?.status ?? null,
    };
  });

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: rows,
  });
}
