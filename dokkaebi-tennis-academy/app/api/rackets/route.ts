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
  const keyword = searchParams.get('q')?.trim() || null;

  // 가격 범위 파라미터: min/max + minPrice/maxPrice(별칭) 둘 다 지원
  const minStr = searchParams.get('min') ?? searchParams.get('minPrice');
  const maxStr = searchParams.get('max') ?? searchParams.get('maxPrice');

  // /api/rackets 기본 응답은 "배열" 유지(기존 호환).
  // withTotal=1(또는 true)인 경우에만 total을 포함한 객체로 반환.
  const withTotal = (() => {
    const v = (searchParams.get('withTotal') ?? '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  })();

  const rentOnly = (() => {
    const v = (searchParams.get('rentOnly') ?? '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  })();

  const q: any = { $or: [{ status: { $exists: false } }, { status: { $nin: ['inactive', '비노출', 'sold'] } }] };

  // 브랜드(대소문자 무시) — 예: ?brand=yonex
  if (brand) q.brand = { $regex: brand, $options: 'i' };

  // 상태등급 필터 — 예: ?cond=A
  if (cond === 'A' || cond === 'B' || cond === 'C') q.condition = cond;

  // 대여 가능만 보기: rental.enabled=true
  if (rentOnly) q['rental.enabled'] = true;

  // 키워드 검색: model(기본) + brand(보조)
  if (keyword) {
    q.$and = [
      ...(q.$and ?? []),
      {
        $or: [{ model: { $regex: keyword, $options: 'i' } }, { brand: { $regex: keyword, $options: 'i' } }],
      },
    ];
  }

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

  // withTotal=1이면 total까지 같이 내려주기 위해 countDocuments를 병렬로 수행
  // - cursor에는 limit이 걸릴 수 있지만, total은 "필터 조건(q)" 기준 전체 개수여야 하므로 countDocuments(q)를 별도로 사용
  const [docs, total] = await Promise.all([cursor.toArray(), withTotal ? col.countDocuments(q) : Promise.resolve(0)]);

  // _id는 제거하고 id만 내려주기(깔끔)
  const items = docs.map((r: any) => {
    const { _id, ...rest } = r;
    return { ...rest, id: String(_id) };
  });

  // 기본(기존 호환): 배열 그대로 반환
  if (!withTotal) return NextResponse.json(items);

  // 확장 응답: total 포함
  return NextResponse.json({ items, total });
}
