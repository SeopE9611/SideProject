import { NextRequest, NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getHangulInitials } from "@/lib/hangul-utils";
import { productVisibilityFilterFor, racketVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";

type SearchResult = {
  _id: string; // 기존 SearchPreview가 쓰는 필드 유지
  type: "product" | "racket";
  name: string;
  brand?: string;
  price?: number;
  image?: string | null;
};

const SEARCH_RESULT_LIMIT = 10;
const CHOSUNG_CANDIDATE_LIMIT = 50;

const searchProjection = {
  name: 1,
  model: 1,
  brand: 1,
  price: 1,
  thumbnailUrl: 1,
  images: { $slice: 1 },
  searchKeywords: 1,
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withSearchFilter(baseFilter: Filter<Document>, searchFields: string[], escapedQuery: string) {
  const searchFilter: Filter<Document> = {
    $or: searchFields.map((field) => ({ [field]: { $regex: escapedQuery, $options: "i" } })),
  };

  return { $and: [baseFilter, searchFilter] } satisfies Filter<Document>;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query")?.trim() || "";

    // 검색어가 없으면 바로 빈 배열 반환
    if (!query) {
      const response = NextResponse.json<SearchResult[]>([]);
      response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
      return response;
    }

    const client = await clientPromise;
    const db = client.db();
    const viewer = await getVisibilityViewerFromCookies();

    const initialsQuery = getHangulInitials(query);
    const isChosungOnly = /^[ㄱ-ㅎ]+$/.test(query); // 초성만 입력된 경우
    const lowerQuery = query.toLowerCase();
    const escapedQuery = escapeRegExp(query);

    // 간단한 매칭 함수: name / brand / searchKeywords 를 모두 대상으로
    const matchText = (targets: (string | undefined | null)[]) => {
      const joined = targets.filter(Boolean).join(" ");

      if (!joined) return false;

      if (isChosungOnly) {
        // 초성 검색일 경우: 전체 텍스트에 대한 초성 문자열에서 검색
        const initials = getHangulInitials(joined);
        return initials.includes(initialsQuery);
      }

      // 일반 문자열 검색: 소문자 변환 후 부분 포함 여부
      return joined.toLowerCase().includes(lowerQuery);
    };

    const productBaseFilter = productVisibilityFilterFor(viewer) as Filter<Document>;
    const racketBaseFilter = racketVisibilityFilterFor(viewer) as Filter<Document>;
    const productSearchFields = ["name", "brand", "searchKeywords"];
    const racketSearchFields = ["model", "brand", "searchKeywords"];
    const productSearchFilter = isChosungOnly
      ? productBaseFilter
      : withSearchFilter(productBaseFilter, productSearchFields, escapedQuery);
    const racketSearchFilter = isChosungOnly
      ? racketBaseFilter
      : withSearchFilter(racketBaseFilter, racketSearchFields, escapedQuery);
    const candidateLimit = isChosungOnly ? CHOSUNG_CANDIDATE_LIMIT : SEARCH_RESULT_LIMIT;

    // 스트링 상품/중고 라켓 조회: DB 쿼리에서 검색 후보를 줄이고 필요한 필드만 가져옴
    const [products, rackets] = await Promise.all([
      db
        .collection("products")
        .find(productSearchFilter)
        .project(searchProjection)
        .limit(candidateLimit)
        .toArray(),
      db
        .collection("used_rackets")
        .find(racketSearchFilter)
        .project(searchProjection)
        .limit(candidateLimit)
        .toArray(),
    ]);

    const results: SearchResult[] = [];

    // 스트링 상품 매칭
    for (const p of products as any[]) {
      const searchKeywords: string[] = Array.isArray(p.searchKeywords) ? p.searchKeywords : [];

      const ok = isChosungOnly ? matchText([p.name, p.brand, ...searchKeywords]) : true;
      if (!ok) continue;

      results.push({
        _id: String(p._id),
        type: "product",
        name: p.name ?? "",
        brand: p.brand ?? "",
        price: typeof p.price === "number" ? p.price : 0,
        image:
          (Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0] === "string"
            ? p.images[0]
            : p.thumbnailUrl) ?? null,
      });
    }

    // 중고 라켓 매칭 (brand + model 중심)
    for (const r of rackets as any[]) {
      const searchKeywords: string[] = Array.isArray(r.searchKeywords) ? r.searchKeywords : [];

      const ok = isChosungOnly ? matchText([r.model, r.brand, ...searchKeywords]) : true;
      if (!ok) continue;

      results.push({
        _id: String(r._id),
        type: "racket",
        name: r.model ?? "",
        brand: r.brand ?? "",
        price: typeof r.price === "number" ? r.price : 0,
        image:
          Array.isArray(r.images) && r.images.length > 0 && typeof r.images[0] === "string"
            ? r.images[0]
            : null,
      });
    }

    // 너무 길어지는 것을 방지하기 위해 상위 10개만 반환
    const limited = results.slice(0, SEARCH_RESULT_LIMIT);

    const response = NextResponse.json(limited);
    response.headers.set(
      "Cache-Control",
      viewer.isAdmin ? "no-store" : "public, s-maxage=15, stale-while-revalidate=30",
    );
    return response;
  } catch (err) {
    console.error("[통합 검색 오류]", err);
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}
