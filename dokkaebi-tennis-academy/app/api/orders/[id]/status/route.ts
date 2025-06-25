import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  //  인증 처리
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return new NextResponse('유효하지 않은 주문 ID입니다.', { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();
  const order = await db.collection('orders').findOne({ _id: new ObjectId(id) }, { projection: { status: 1 } });

  if (!order) {
    return new NextResponse('주문을 찾을 수 없습니다.', { status: 404 });
  }

  return NextResponse.json(order);
}
