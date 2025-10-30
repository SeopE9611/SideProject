import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// - 관리자/사용자 공용 목록(최소형): status !== 'inactive' 만 노출
// - 쿼리 파라미터(brand/condition/min/max)는 후속 단계에서 확장 가능
export async function GET() {
  const db = (await clientPromise).db();
  const docs = await db
    .collection('used_rackets')
    .find({ status: { $ne: 'inactive' } })
    .project({ brand: 1, model: 1, price: 1, condition: 1, images: 1, status: 1, rental: 1 })
    .toArray();

  const items = docs.map((r: any) => ({ ...r, id: r._id.toString(), _id: undefined }));
  return NextResponse.json(items);
}
