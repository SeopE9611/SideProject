import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
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
