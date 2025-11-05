import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

type UsedRacketDoc = { _id: ObjectId | string } & Record<string, any>;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = (await clientPromise).db();
  const col = db.collection<UsedRacketDoc>('used_rackets');
  const { id } = params;

  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

  const doc = await col.findOne(filter);

  if (!doc) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({ ...doc, id: String(doc._id), _id: undefined });
}
