import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  // 인증
  const at = (await cookies()).get('accessToken')?.value;
  if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // 파라미터
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Bad Request' }, { status: 400 });

  const db = (await clientPromise).db();
  const doc = await db.collection('rental_orders').findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(payload.sub), // 소유자 검증(중요)
  });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 응답 평탄화
  return NextResponse.json({
    id: doc._id.toString(),
    brand: doc.brand,
    model: doc.model,
    days: doc.days,
    status: doc.status, // created | paid | out | returned
    amount: doc.amount, // { fee, deposit, total }
    createdAt: doc.createdAt,
    dueAt: doc.dueAt ?? null,
  });
}
