import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Sort } from "mongodb";

export const dynamic = "force-dynamic";
function normalizeRacketMarketing(value: any) {
  return {
    isFeatured: value?.isFeatured === true,
    isNew: value?.isNew === true,
    isSale: value?.isSale === true,
    salePrice: Math.max(0, Number(value?.salePrice ?? 0) || 0),
  };
}

// - 관리자/사용자 공용 목록(최소형): status !== 'inactive' 만 노출
// - 쿼리 파라미터(brand/condition/min/max/minPrice/maxPrice/sort) 지원
export async function GET(req: Request) {
  const db = (await clientPromise).db();
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand")?.trim();
  const cond = searchParams.get("cond")?.trim(); // 'A' | 'B' | 'C'
  const keyword = searchParams.get("q")?.trim() || null;
  const exposure = searchParams.get("exposure") || "all";

  // 가격 범위 파라미터: min/max + minPrice/maxPrice(별칭) 둘 다 지원
  const minStr = searchParams.get("min") ?? searchParams.get("minPrice");
  const maxStr = searchParams.get("max") ?? searchParams.get("maxPrice");

  // /api/rackets 기본 응답은 "배열" 유지(기존 호환).
  // withTotal=1(또는 true)인 경우에만 total을 포함한 객체로 반환.
  const withTotal = (() => {
    const v = (searchParams.get("withTotal") ?? "").toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  })();

  const rentOnly = (() => {
    const v = (searchParams.get("rentOnly") ?? "").toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "on";
  })();

  // 기본 목록에서는 sold(품절/판매완료)도 노출,
  // 단 "대여 가능만(rentOnly)"에서는 sold를 제외해 결과/total을 정확히 유지
  const hiddenStatuses = rentOnly
    ? ["inactive", "비노출", "sold"]
    : ["inactive", "비노출"];
  const q: any = {
    $or: [{ status: { $exists: false } }, { status: { $nin: hiddenStatuses } }],
  };

  // 브랜드(대소문자 무시) — 예: ?brand=yonex
  if (brand) q.brand = { $regex: brand, $options: "i" };

  // 상태등급 필터 — 예: ?cond=A
  if (cond === "A" || cond === "B" || cond === "C") q.condition = cond;

  // 대여 가능만 보기: rental.enabled=true
  if (rentOnly) q["rental.enabled"] = true;

  if (exposure === "featured") q["marketing.isFeatured"] = true;
  else if (exposure === "new") q["marketing.isNew"] = true;
  else if (exposure === "sale") q["marketing.isSale"] = true;

  // 키워드 검색: model(기본) + brand(보조)
  if (keyword) {
    q.$and = [
      ...(q.$and ?? []),
      {
        $or: [
          { model: { $regex: keyword, $options: "i" } },
          { brand: { $regex: keyword, $options: "i" } },
        ],
      },
    ];
  }

  // 가격 범위 — 예: ?minPrice=100000&maxPrice=200000 (기존 min/max 별칭도 유지)
  if (minStr !== null && minStr.trim() !== "") {
    const min = Number(minStr);
    if (Number.isFinite(min) && min >= 0) {
      q.price = { ...(q.price || {}), $gte: min };
    }
  }
  if (maxStr !== null && maxStr.trim() !== "") {
    const max = Number(maxStr);
    if (Number.isFinite(max) && max >= 0) {
      q.price = { ...(q.price || {}), $lte: max };
    }
  }

  // 정렬 & 개수 제한
  const sortParam = searchParams.get("sort") ?? "latest";
  const limitParam = Number(searchParams.get("limit") ?? 0);

  let sort: Sort;
  if (sortParam === "price-low") {
    sort = { price: 1, _id: -1 };
  } else if (sortParam === "price-high") {
    sort = { price: -1, _id: -1 };
  } else if (sortParam === "reviews-desc") {
    sort = { reviewCount: -1, ratingCount: -1, createdAt: -1, _id: -1 };
  } else if (sortParam === "sales-desc") {
    sort = {
      purchaseCount: -1,
      salesCount: -1,
      orderCount: -1,
      createdAt: -1,
      _id: -1,
    };
  } else {
    // latest 기본값: createdAt이 없는 오래된 문서도 _id 보조 정렬로 안정화
    sort = { createdAt: -1, _id: -1 };
  }

  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 50)
      : undefined;

  const col = db.collection("used_rackets");

  let cursor = col.find(q).project({
    brand: 1,
    model: 1,
    price: 1,
    condition: 1,
    images: 1,
    status: 1,
    rental: 1,
    reviewCount: 1,
    ratingCount: 1,
    purchaseCount: 1,
    salesCount: 1,
    orderCount: 1,
    marketing: 1,
  });

  cursor = cursor.sort(sort);
  if (limit) cursor = cursor.limit(limit);

  // withTotal=1이면 total까지 같이 내려주기 위해 countDocuments를 병렬로 수행
  // - cursor에는 limit이 걸릴 수 있지만, total은 "필터 조건(q)" 기준 전체 개수여야 하므로 countDocuments(q)를 별도로 사용
  const [docs, total] = await Promise.all([
    cursor.toArray(),
    withTotal ? col.countDocuments(q) : Promise.resolve(0),
  ]);

  // _id는 제거하고 id만 내려주기(깔끔)
  const items = docs.map((r: any) => {
    const { _id, ...rest } = r;
    return {
      ...rest,
      marketing: normalizeRacketMarketing((rest as any).marketing),
      id: String(_id),
    };
  });

  // 기본(기존 호환): 배열 그대로 반환
  if (!withTotal) return NextResponse.json(items);

  // 확장 응답: total 포함
  return NextResponse.json({ items, total });
}
