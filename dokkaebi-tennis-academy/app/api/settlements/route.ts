import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  const db = await getDb();
  const rows = await db
    .collection('settlements')
    .find({}, { projection: { _id: 0 } })
    .sort({ yyyymm: -1 })
    .toArray();
  return NextResponse.json(rows);
}
