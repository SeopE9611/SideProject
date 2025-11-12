import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { Sort } from 'mongodb';

export const dynamic = 'force-dynamic';

// - 관리자/사용자 공용 목록(최소형): status !== 'inactive' 만 노출
// - 쿼리 파라미터(brand/condition/min/max)는 후속 단계에서 확장 가능
export async function GET(req: Request) {
  const db = (await clientPromise).db();
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get('brand')?.trim();
  const cond = searchParams.get('cond')?.trim(); // 'A' | 'B' | 'C'
  const minStr = searchParams.get('min');
  const maxStr = searchParams.get('max');
  const q: any = { $or: [{ status: { $exists: false } }, { status: { $nin: ['inactive', '비노출'] } }] };

  // 브랜드(대소문자 무시) — 예: ?brand=yonex
  if (brand) q.brand = { $regex: brand, $options: 'i' };

  // 상태등급 필터 — 예: ?cond=A
  if (cond === 'A' || cond === 'B' || cond === 'C') q.condition = cond;

  // 가격 범위 — 예: ?min=100000&max=200000
  if (minStr !== null && minStr.trim() !== '') {
    const min = Number(minStr);
    if (!Number.isNaN(min)) q.price = { ...(q.price || {}), $gte: min };
  }
  if (maxStr !== null && maxStr.trim() !== '') {
    const max = Number(maxStr);
    if (!Number.isNaN(max)) q.price = { ...(q.price || {}), $lte: max };
  }

  // 정렬 & 개수 제한
  const sortParam = searchParams.get('sort');
  const limitParam = Number(searchParams.get('limit') ?? 0);

  // createdAt 내림차순만 우선 지원 (필요 시 확장 가능)
  let sort: Sort | undefined;
  if (sortParam === 'createdAt_desc') sort = { createdAt: -1 };

  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : undefined;

  const col = db.collection('used_rackets');

  let cursor = col.find(q).project({
    brand: 1,
    model: 1,
    price: 1,
    condition: 1,
    images: 1,
    status: 1,
    rental: 1,
  });

  if (sort) cursor = cursor.sort(sort);
  if (limit) cursor = cursor.limit(limit);

  const docs = await cursor.toArray();

  const items = docs.map((r: any) => ({
    ...r,
    id: String(r._id),
    _id: undefined, // 클라이언트에서 id만 쓰도록 정규화
  }));

  return NextResponse.json(items);
}
