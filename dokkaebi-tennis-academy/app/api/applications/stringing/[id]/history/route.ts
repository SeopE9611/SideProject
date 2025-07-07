import { NextResponse } from 'next/server';
import clientPromise, { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// stringing_applications 문서 내부의 history 배열을 조회
export async function GET(req: Request, context: { params: { id: string } }) {
  const client = await clientPromise;
  const db = await getDb();
  const { id } = context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }

  const application = await db.collection('stringing_applications').findOne(
    { _id: new ObjectId(id) },
    { projection: { history: 1 } } // history 필드만 조회
  );

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const logs = application.history || [];

  // 최신순 정렬
  logs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(logs);
}
