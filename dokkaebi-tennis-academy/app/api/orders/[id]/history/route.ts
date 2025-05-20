import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const client = await clientPromise;
  const db = client.db();

  const order = await db.collection('orders').findOne({ _id: new ObjectId(id) }, { projection: { history: 1 } });

  return NextResponse.json(order?.history ?? []);
}
