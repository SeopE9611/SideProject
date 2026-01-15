import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

function toNum(v: string | null) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function range(min: number | null, max: number | null) {
  const q: Record<string, number> = {};
  if (min != null) q.$gte = min;
  if (max != null) q.$lte = max;
  return Object.keys(q).length ? q : null;
}

function normalizePattern(p: string) {
  return p.replace(/\s+/g, '').replace(/×/g, 'x').toLowerCase();
}

// strict=1: 스펙 누락 상품 제외(정확도 우선)
// strict=0 (기본): 스펙 누락 상품도 포함(편의/결과량 우선)
function maybeRangeWithNull(field: string, r: any, strict: boolean) {
  if (!r) return null;
  if (strict) {
    return { [field]: r };
  }
  // 범위 만족 OR 값이 null/없음도 포함
  return {
    $or: [{ [field]: r }, { [field]: null }, { [field]: { $exists: false } }],
  };
}

export async function GET(req: Request) {
  const db = (await clientPromise).db();
  const sp = new URL(req.url).searchParams;

  // pagination
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const pageSize = Math.min(48, Math.max(1, Number(sp.get('pageSize') ?? 12)));
  const skip = (page - 1) * pageSize;

  // text
  const q = (sp.get('q') ?? '').trim();

  // basic filters
  const brand = (sp.get('brand') ?? '').trim().toLowerCase();
  const condition = (sp.get('condition') ?? '').trim().toUpperCase(); // A/B/C

  // strict toggle
  const strict = sp.get('strict') === '1';

  // multi patterns (pattern=16x19&pattern=18x20 ...)
  const patternsRaw = sp
    .getAll('pattern')
    .map((p) => normalizePattern(p))
    .filter(Boolean);

  // numeric ranges
  const priceR = range(toNum(sp.get('minPrice')), toNum(sp.get('maxPrice')));
  const headR = range(toNum(sp.get('minHeadSize')), toNum(sp.get('maxHeadSize')));
  const weightR = range(toNum(sp.get('minWeight')), toNum(sp.get('maxWeight')));
  const balanceR = range(toNum(sp.get('minBalance')), toNum(sp.get('maxBalance')));
  const lenR = range(toNum(sp.get('minLengthIn')), toNum(sp.get('maxLengthIn')));
  const raR = range(toNum(sp.get('minStiffnessRa')), toNum(sp.get('maxStiffnessRa')));
  const swR = range(toNum(sp.get('minSwingWeight')), toNum(sp.get('maxSwingWeight')));

  // match
  const match: any = {
    status: { $nin: ['inactive', '비노출', 'sold'] },
  };

  if (q) {
    match.$or = [{ model: { $regex: q, $options: 'i' } }, { searchKeywords: { $elemMatch: { $regex: q, $options: 'i' } } }];
  }
  if (brand) match.brand = brand;
  if (condition) match.condition = condition;
  if (priceR) match.price = priceR;

  // 스펙 범위 필터: strict=1이면 누락 제외, 기본은 누락 포함(B)
  const specClauses: any[] = [];
  const c1 = maybeRangeWithNull('spec.headSize', headR, strict);
  const c2 = maybeRangeWithNull('spec.weight', weightR, strict);
  const c3 = maybeRangeWithNull('spec.balance', balanceR, strict);
  const c4 = maybeRangeWithNull('spec.lengthIn', lenR, strict);
  const c5 = maybeRangeWithNull('spec.stiffnessRa', raR, strict);
  const c6 = maybeRangeWithNull('spec.swingWeight', swR, strict);
  if (c1) specClauses.push(c1);
  if (c2) specClauses.push(c2);
  if (c3) specClauses.push(c3);
  if (c4) specClauses.push(c4);
  if (c5) specClauses.push(c5);
  if (c6) specClauses.push(c6);
  if (specClauses.length) match.$and = [...(match.$and ?? []), ...specClauses];

  if (patternsRaw.length) match['spec.pattern'] = { $in: patternsRaw };

  const col = db.collection('used_rackets');
  const total = await col.countDocuments(match);

  const docs = await col
    .find(match)
    .project({
      brand: 1,
      model: 1,
      year: 1,
      condition: 1,
      price: 1,
      images: 1,
      rental: 1,
      quantity: 1,
      status: 1,
      spec: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .toArray();

  const items = docs.map((d: any) => ({ ...d, id: d._id.toString(), _id: undefined }));
  return NextResponse.json({ items, total, page, pageSize, strict });
}
