import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { parseBenefitFilters } from "@/lib/benefit-labels";
import { getHangulInitials } from "@/lib/hangul-utils";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import { createApiPerfLogger } from "@/lib/api/perf";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";

type ProductDoc = {
  _id: ObjectId;
  name?: string;
  price?: number;
  images?: string[];
  brand?: string;
  material?: string;
  mountingFee?: number;
  features?: {
    power?: number;
    control?: number;
    spin?: number;
    durability?: number;
    comfort?: number;
  };
  inventory?: {
    stock?: number;
    manageStock?: boolean;
    status?: string;
    isFeatured?: boolean;
    isNew?: boolean;
    isSale?: boolean;
    salePrice?: number;
  };
  ratingCount?: number;
  ratingAvg?: number;
  ratingAverage?: number;
  isDeleted?: boolean;
  isVisible?: boolean;
};

const productListProjection = {
  name: 1,
  brand: 1,
  price: 1,
  images: 1,
  image: 1,
  imageUrl: 1,
  thumbnail: 1,
  shortDescription: 1,
  material: 1,
  gauge: 1,
  gaugeOptions: 1,
  gaugeInventories: 1,
  color: 1,
  colorOptions: 1,
  colorInventories: 1,
  variantInventories: 1,
  mountingFee: 1,
  shippingFee: 1,
  features: 1,
  tags: 1,
  inventory: 1,
  isNew: 1,
  ratingCount: 1,
  ratingAvg: 1,
  ratingAverage: 1,
};

export { POST } from "@/app/api/admin/products/route";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFeatureFilterParam(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1 && n <= 5) return Math.round(n * 20);
  return Math.min(100, Math.max(1, Math.round(n)));
}

export async function GET(req: NextRequest) {
  const perf = createApiPerfLogger("GET /api/products");
  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const viewer = await getVisibilityViewerFromCookies();

    // preview=1일 경우: 실시간 미리보기용 검색 (초성 포함)
    if (params.get("preview") === "1") {
      const query = params.get("query")?.trim() || "";
      const client = await perf.measure("dbConnect", clientPromise);
      const db = client.db();
      const collection = db.collection<ProductDoc>("products");
      const previewProjection = { name: 1, price: 1, images: 1 };
      const isChosungOnly = /^[ㄱ-ㅎ]+$/.test(query); // 초성만 입력된 경우

      const products = await perf.measure("previewQuery", async () => {
        // isDeleted 플래그가 true인 문서는 제외
        if (!query) {
          return collection
            .find(productVisibilityFilterFor(viewer))
            .project(previewProjection)
            .sort({ _id: -1 })
            .limit(10)
            .toArray();
        }

        if (!isChosungOnly) {
          return collection
            .find({
              ...productVisibilityFilterFor(viewer),
              name: { $regex: escapeRegExp(query), $options: "i" },
            })
            .project(previewProjection)
            .limit(10)
            .toArray();
        }

        const initialsQuery = getHangulInitials(query);
        const candidates = await collection
          .find(productVisibilityFilterFor(viewer))
          .project(previewProjection)
          .sort({ _id: -1 })
          .limit(500)
          .toArray();

        return candidates
          .filter((product) => getHangulInitials(product.name ?? "").includes(initialsQuery))
          .slice(0, 10);
      });

      const response = NextResponse.json(
        products.map((product) => ({
          _id: product._id.toString(),
          name: product.name,
          price: product.price,
          image: product.images?.[0] ?? null,
        })),
      );
      response.headers.set(
        "Cache-Control",
        viewer.isAdmin ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60",
      );
      perf.log({ preview: true, resultCount: products.length });
      return response;
    }

    // 필터/페이징 상품 리스트 반환
    // 필터 파싱
    const brand = params.get("brand");
    const power = params.get("power");
    const control = params.get("control");
    const spin = params.get("spin");
    const durability = params.get("durability");
    const comfort = params.get("comfort");
    const q = params.get("q") || "";
    const sort = params.get("sort") || "latest";
    const material = params.get("material");
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const purpose = params.get("purpose");
    const isFeatured = params.get("isFeatured"); // 'true' | 'false'
    const exposure = params.get("exposure") || "all";
    const exclude = params.get("exclude"); // string(ObjectId)
    const includeSoldOut = params.get("includeSoldOut") === "true";

    // 페이징
    const page = Math.max(1, Number(params.get("page") || "1"));
    const limit = Math.min(100, Number(params.get("limit") || "12"));
    const skip = (page - 1) * limit;

    const filter: Filter<ProductDoc> = {
      ...productVisibilityFilterFor(viewer),
    }; // Soft-Delete된 상품은 기본적으로 제외
    if (brand) filter.brand = brand;

    const powerScore = normalizeFeatureFilterParam(power);
    if (powerScore !== null) filter["features.power"] = { $gte: powerScore };
    const controlScore = normalizeFeatureFilterParam(control);
    if (controlScore !== null) filter["features.control"] = { $gte: controlScore };
    const spinScore = normalizeFeatureFilterParam(spin);
    if (spinScore !== null) filter["features.spin"] = { $gte: spinScore };
    const durabilityScore = normalizeFeatureFilterParam(durability);
    if (durabilityScore !== null) filter["features.durability"] = { $gte: durabilityScore };
    const comfortScore = normalizeFeatureFilterParam(comfort);
    if (comfortScore !== null) filter["features.comfort"] = { $gte: comfortScore };
    if (q) filter.name = { $regex: escapeRegExp(q), $options: "i" };
    if (material) filter.material = material;
    if (isFeatured === "true") filter["inventory.isFeatured"] = true;
    const exposureFilters = parseBenefitFilters(exposure);
    if (exposureFilters.length > 0) {
      const exposureOr = exposureFilters.map((item) => {
        if (item === "featured") return { "inventory.isFeatured": true };
        if (item === "new") return { "inventory.isNew": true };
        return { "inventory.isSale": true };
      });
      (filter as any).$and = [...(((filter as any).$and as any[]) ?? []), { $or: exposureOr }];
    }

    // 기본 목록은 품절 상품을 제외한다.
    // ProductCard의 품절 판정과 어긋나지 않도록 inventory.status=outofstock도 제외하고,
    // 옵션 재고는 variant → gauge → color → inventory.manageStock 순서로 서버 쿼리에 반영한다.
    if (!includeSoldOut) {
      (filter as any).$and = [
        ...(((filter as any).$and as any[]) ?? []),
        { "inventory.status": { $ne: "outofstock" } },
        {
          $or: [
            {
              variantInventories: {
                $elemMatch: {
                  isSoldOut: { $ne: true },
                  stock: { $gt: 0 },
                },
              },
            },
            {
              $and: [
                {
                  $or: [
                    { variantInventories: { $exists: false } },
                    { variantInventories: { $size: 0 } },
                  ],
                },
                {
                  gaugeInventories: {
                    $elemMatch: {
                      isSoldOut: { $ne: true },
                      stock: { $gt: 0 },
                    },
                  },
                },
              ],
            },
            {
              $and: [
                {
                  $or: [
                    { variantInventories: { $exists: false } },
                    { variantInventories: { $size: 0 } },
                  ],
                },
                {
                  $or: [
                    { gaugeInventories: { $exists: false } },
                    { gaugeInventories: { $size: 0 } },
                  ],
                },
                {
                  colorInventories: {
                    $elemMatch: {
                      isSoldOut: { $ne: true },
                      stock: { $gt: 0 },
                    },
                  },
                },
              ],
            },
            {
              $and: [
                {
                  $or: [
                    { variantInventories: { $exists: false } },
                    { variantInventories: { $size: 0 } },
                  ],
                },
                {
                  $or: [
                    { gaugeInventories: { $exists: false } },
                    { gaugeInventories: { $size: 0 } },
                  ],
                },
                {
                  $or: [
                    { colorInventories: { $exists: false } },
                    { colorInventories: { $size: 0 } },
                  ],
                },
                {
                  $or: [
                    { "inventory.manageStock": { $ne: true } },
                    { "inventory.stock": { $gt: 0 } },
                  ],
                },
              ],
            },
          ],
        },
      ];
    }

    // 가격 범위 필터(기존 훅(useInfiniteProducts)에서 이미 사용중인 파라미터를 서버에서 반영)
    if (minPrice || maxPrice) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (minPrice !== null && minPrice !== undefined && minPrice !== "") {
        const min = Number(minPrice);
        if (Number.isFinite(min)) priceFilter.$gte = min;
      }
      if (maxPrice !== null && maxPrice !== undefined && maxPrice !== "") {
        const max = Number(maxPrice);
        if (Number.isFinite(max)) priceFilter.$lte = max;
      }
      if (Object.keys(priceFilter).length > 0) filter.price = priceFilter;
    }

    // purpose 필터: 특정 "용도"에 맞는 상품만 노출
    // - stringing: 교체 서비스에 쓰는 스트링 상품(=mountingFee가 있는 상품)만 보여준다.
    if (purpose === "stringing") {
      filter.mountingFee = { $type: "number" as any, $gte: 0 };
    }
    const client = await perf.measure("dbConnect", clientPromise);
    const db = client.db();
    const collection = db.collection<ProductDoc>("products");

    let sortObj: { [key: string]: 1 | -1 } = { _id: -1 };

    if (sort === "price-low") sortObj = { price: 1 };
    else if (sort === "price-high") sortObj = { price: -1 };
    else if (sort === "reviews-desc") sortObj = { ratingCount: -1, ratingAvg: -1, _id: -1 };

    const idFilter =
      exclude && ObjectId.isValid(exclude) ? { _id: { $ne: new ObjectId(exclude) } } : {};
    const composed = { ...filter, ...idFilter };

    const [total, itemsRaw] = await perf.measure("query", () =>
      Promise.all([
        perf.measure("products.count", () => collection.countDocuments(composed)),
        perf.measure("products.find", () =>
          collection
            .find(composed)
            .project(productListProjection)
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .toArray(),
        ),
      ]),
    );

    const items = itemsRaw.map((product) => {
      const ratingAvgValue = Number(product.ratingAvg ?? product.ratingAverage);
      const ratingCountValue = Number(product.ratingCount);
      return {
        ...product,
        _id: product._id.toString(),
        ratingAvg: Number.isFinite(ratingAvgValue) ? ratingAvgValue : 0,
        ratingAverage: Number.isFinite(ratingAvgValue) ? ratingAvgValue : 0,
        ratingCount: Number.isFinite(ratingCountValue) ? Math.max(0, ratingCountValue) : 0,
      };
    });

    const hasMore = skip + items.length < total;

    const response = NextResponse.json({
      products: items,
      pagination: { page, limit, total, hasMore },
    });
    response.headers.set(
      "Cache-Control",
      viewer.isAdmin ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60",
    );
    perf.log({ page, limit, total, resultCount: items.length });
    return response;
  } catch (err) {
    console.error("[상품 리스트 조회 오류]", err);
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}
