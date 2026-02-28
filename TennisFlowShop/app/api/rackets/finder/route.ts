import { NextResponse } from 'next/server';
import { GRIP_SIZE_OPTIONS, normalizeAndValidateGripSize, normalizeAndValidateStringPattern, normalizeGripSize } from '@/lib/constants';
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

// 과거 자유입력 데이터까지 최대한 검색되도록 value + 대표 별칭을 함께 매칭
function buildPatternCandidates(patterns: string[]) {
  const values = new Set<string>();
  for (const pattern of patterns) {
    const normalized = normalizeAndValidateStringPattern(pattern);
    if (!normalized) continue;
    values.add(normalized);
    values.add(normalized.toUpperCase());
    values.add(normalized.replace('x', 'X'));
  }
  return Array.from(values);
}

function buildGripSizeCandidates(gripSizes: string[]) {
  const values = new Set<string>();
  for (const gripSize of gripSizes) {
    const normalized = normalizeAndValidateGripSize(gripSize);
    if (!normalized) continue;

    values.add(normalized);
    values.add(normalized.toLowerCase());

    // G1/G2/G3 value에 대응하는 화면 label도 검색 후보로 포함
    const label = GRIP_SIZE_OPTIONS.find((option) => option.value === normalized)?.label;
    if (label) {
      values.add(label);
      values.add(label.replace(/\s+/g, ''));
    }

    // 문자열 숫자 표기(예: 4 1/8) 일부도 후보에 추가
    if (normalized === 'G1') values.add('4 1/8');
    if (normalized === 'G2') values.add('4 1/4');
    if (normalized === 'G3') values.add('4 3/8');
  }

  return Array.from(values).map((value) => normalizeGripSize(value));
}

function normalizeRental(r: any) {
  if (!r) return null;

  const fee = r.fee;
  const feeOk = fee && Number.isFinite(Number(fee.d7)) && Number.isFinite(Number(fee.d15)) && Number.isFinite(Number(fee.d30));

  const enabled = !!r.enabled && feeOk;

  return {
    enabled,
    deposit: Number.isFinite(Number(r.deposit)) ? Number(r.deposit) : 0,
    fee: feeOk ? { d7: Number(fee.d7), d15: Number(fee.d15), d30: Number(fee.d30) } : undefined,
    // enabled=true인데 fee가 없으면, UI가 "대여 불가"로 떨어지도록 사유를 세팅
    disabledReason: enabled ? null : r.disabledReason ?? '대여 정보(요금)가 누락되었습니다.',
  };
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

type SortResolved =
  | {
      key: string;
      kind: 'find';
      sort: Record<string, 1 | -1>;
    }
  | {
      key: string;
      kind: 'agg';
      field: string;
      dir: 1 | -1;
    };

function resolveSort(sortKey: string | null): SortResolved {
  const key = (sortKey ?? 'createdAt_desc').trim();

  // 기본: 최신순
  if (key === 'createdAt_desc') return { key, kind: 'find', sort: { createdAt: -1 } };

  // 가격 정렬(가격은 null 가능성이 거의 없으므로 find sort로 충분)
  if (key === 'price_asc') return { key, kind: 'find', sort: { price: 1, createdAt: -1 } };
  if (key === 'price_desc') return { key, kind: 'find', sort: { price: -1, createdAt: -1 } };

  // 스펙 정렬(특정 스펙이 null/누락인 라켓이 있을 수 있으므로 "null은 항상 아래"로 보내기 위해 aggregation 사용)
  if (key === 'swingWeight_asc') return { key, kind: 'agg', field: 'spec.swingWeight', dir: 1 as const };
  if (key === 'swingWeight_desc') return { key, kind: 'agg', field: 'spec.swingWeight', dir: -1 as const };
  if (key === 'weight_asc') return { key, kind: 'agg', field: 'spec.weight', dir: 1 as const };
  if (key === 'weight_desc') return { key, kind: 'agg', field: 'spec.weight', dir: -1 as const };
  if (key === 'stiffnessRa_asc') return { key, kind: 'agg', field: 'spec.stiffnessRa', dir: 1 as const };
  if (key === 'stiffnessRa_desc') return { key, kind: 'agg', field: 'spec.stiffnessRa', dir: -1 as const };

  // 알 수 없는 값이면 안전하게 기본값으로
  return { key: 'createdAt_desc', kind: 'find', sort: { createdAt: -1 } };
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

  // sort
  const sortResolved = resolveSort(sp.get('sort'));

  // multi patterns (pattern=16x19&pattern=18x20 ...)
  const patternsRaw = sp
    .getAll('pattern')
    .map((pattern) => normalizeAndValidateStringPattern(pattern))
    .filter(Boolean);

  // multi grip size (gripSize=G1&gripSize=G2 ...)
  const gripSizesRaw = sp
    .getAll('gripSize')
    .map((gripSize) => normalizeAndValidateGripSize(gripSize))
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

  if (patternsRaw.length) {
    // 서버 저장 value 기준 + 과거 자유입력 형태를 함께 커버
    match['spec.pattern'] = { $in: buildPatternCandidates(patternsRaw) };
  }

  if (gripSizesRaw.length) {
    // 신규 value(G1/G2/G3) 기준 + 과거 자유입력 표기를 함께 커버
    match['spec.gripSize'] = { $in: buildGripSizeCandidates(gripSizesRaw) };
  }

  const col = db.collection('used_rackets');
  const total = await col.countDocuments(match);

  const projection = {
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
  };

  let docs: any[] = [];

  if (sortResolved.kind === 'agg') {
    // null/누락 스펙은 항상 하단으로 밀기
    // __sortNull: 0(값 있음) / 1(null 또는 누락)
    const fieldRef = '$' + sortResolved.field;
    const sortStage: any = { __sortNull: 1 };
    sortStage[sortResolved.field] = sortResolved.dir;
    sortStage.createdAt = -1; // 타이브레이커(최신 우선)

    docs = await col
      .aggregate([
        { $match: match },
        {
          $addFields: {
            __sortNull: { $cond: [{ $ne: [fieldRef, null] }, 0, 1] },
          },
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: pageSize },
        { $project: projection },
      ])
      .toArray();
  } else {
    docs = await col.find(match).project(projection).sort(sortResolved.sort).skip(skip).limit(pageSize).toArray();
  }

  const items = docs.map((d: any) => ({
    ...d,
    id: d._id.toString(),
    _id: undefined,
    rental: normalizeRental(d.rental),
  }));
  return NextResponse.json({ items, total, page, pageSize, strict, sort: sortResolved.key });
}
