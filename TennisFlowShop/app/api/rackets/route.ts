import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Sort } from "mongodb";
import { parseBenefitFilters } from "@/lib/benefit-labels";
import { createApiPerfLogger } from "@/lib/api/perf";
import { racketVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";

export const dynamic = "force-dynamic";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  const perf = createApiPerfLogger("GET /api/rackets");
  const client = await perf.measure("dbConnect", clientPromise);
  const db = client.db();
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand")?.trim();
  const cond = searchParams.get("cond")?.trim(); // 'A' | 'B' | 'C'
  const keyword = searchParams.get("q")?.trim() || null;
  const exposure = searchParams.get("exposure") || "all";
  const viewer = await getVisibilityViewerFromCookies();

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

  // 일반 사용자는 비노출 라켓을 숨기고, 관리자는 사용자 화면 미리보기를 위해 조회를 허용합니다.
  // 단 "대여 가능만(rentOnly)"에서는 sold를 기존처럼 제외해 실제 대여 가능 정책을 유지합니다.
  const q: any = {
    ...racketVisibilityFilterFor(viewer, { rentOnly }),
  };

  // 브랜드(대소문자 무시) — 예: ?brand=yonex
  if (brand) q.brand = { $regex: escapeRegExp(brand), $options: "i" };

  // 상태등급 필터 — 예: ?cond=A
  if (cond === "A" || cond === "B" || cond === "C") q.condition = cond;

  // 대여 가능만 보기: rental.enabled=true
  if (rentOnly) q["rental.enabled"] = true;

  const exposureFilters = parseBenefitFilters(exposure);
  if (exposureFilters.length > 0) {
    const exposureOr = exposureFilters.map((item) => {
      if (item === "featured") return { "marketing.isFeatured": true };
      if (item === "new") return { "marketing.isNew": true };
      return { "marketing.isSale": true };
    });
    q.$and = [...(q.$and ?? []), { $or: exposureOr }];
  }

  // 키워드 검색: model(기본) + brand(보조)
  if (keyword) {
    const escapedKeyword = escapeRegExp(keyword);
    q.$and = [
      ...(q.$and ?? []),
      {
        $or: [
          { model: { $regex: escapedKeyword, $options: "i" } },
          { brand: { $regex: escapedKeyword, $options: "i" } },
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

  // 정렬 & 페이지/개수 제한
  const sortParam = searchParams.get("sort") ?? "latest";
  const pageParam = Number(searchParams.get("page") ?? 0);
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

  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : undefined;
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 24;

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
  // 기존 limit-only 요청은 그대로 유지하고, page가 명시된 경우에만 skip 적용
  if (page) cursor = cursor.skip((page - 1) * limit);
  cursor = cursor.limit(limit);

  // withTotal=1이면 total까지 같이 내려주기 위해 countDocuments를 병렬로 수행
  // - cursor에는 limit이 걸릴 수 있지만, total은 "필터 조건(q)" 기준 전체 개수여야 하므로 countDocuments(q)를 별도로 사용
  const [docs, total] = await perf.measure("query", () =>
    Promise.all([
      perf.measure("rackets.find", () => cursor.toArray()),
      withTotal ? perf.measure("rackets.count", () => col.countDocuments(q)) : Promise.resolve(0),
    ]),
  );

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
  if (!withTotal) {
    const response = NextResponse.json(items);
    response.headers.set(
      "Cache-Control",
      viewer.isAdmin ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60",
    );
    perf.log({ resultCount: items.length });
    return response;
  }

  // 확장 응답: total 포함
  const response = NextResponse.json({ items, total });
  response.headers.set(
    "Cache-Control",
    viewer.isAdmin ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60",
  );
  perf.log({ resultCount: items.length, total });
  return response;
}
