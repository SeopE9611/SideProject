import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = (await clientPromise).db();
  const doc = await db.collection('used_rackets').findOne({ _id: new ObjectId(params.id) });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  return NextResponse.json({ ...doc, id: doc._id.toString(), _id: undefined });
}
