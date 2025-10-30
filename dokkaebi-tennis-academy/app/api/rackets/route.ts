import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// - 관리자/사용자 공용 목록(최소형): status !== 'inactive' 만 노출
// - 쿼리 파라미터(brand/condition/min/max)는 후속 단계에서 확장 가능
export async function GET(req: Request) {
  const db = (await clientPromise).db();
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get('brand')?.trim();
  const cond = searchParams.get('cond')?.trim(); // 'A' | 'B' | 'C'
  const min = Number(searchParams.get('min') ?? '');
  const max = Number(searchParams.get('max') ?? '');

  const q: any = { status: { $ne: 'inactive' } };

  // 브랜드(대소문자 무시) — 예: ?brand=yonex
  if (brand) q.brand = { $regex: new RegExp(`^${brand}$`, 'i') };

  // 상태등급 필터 — 예: ?cond=A
  if (cond === 'A' || cond === 'B' || cond === 'C') q.condition = cond;

  // 가격 범위 — 예: ?min=100000&max=200000
  if (!Number.isNaN(min)) q.price = { ...(q.price || {}), $gte: min };
  if (!Number.isNaN(max)) q.price = { ...(q.price || {}), $lte: max };

  const docs = await db.collection('used_rackets').find(q).project({ brand: 1, model: 1, price: 1, condition: 1, images: 1, status: 1, rental: 1 }).toArray();

  const items = docs.map((r: any) => ({ ...r, id: r._id.toString(), _id: undefined }));
  return NextResponse.json(items);
}
