import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { parseBenefitFilters } from "@/lib/benefit-labels";
import { getHangulInitials } from "@/lib/hangul-utils";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";

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
  inventory?: { isFeatured?: boolean; isNew?: boolean; isSale?: boolean; salePrice?: number };
  ratingCount?: number;
  ratingAvg?: number;
  ratingAverage?: number;
  isDeleted?: boolean;
};

export { POST } from "@/app/api/admin/products/route";

function normalizeFeatureFilterParam(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1 && n <= 5) return Math.round(n * 20);
  return Math.min(100, Math.max(1, Math.round(n)));
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // preview=1일 경우: 실시간 미리보기용 검색 (초성 포함)
    if (params.get("preview") === "1") {
      const query = params.get("query")?.trim() || "";
      const client = await clientPromise;
      const db = client.db();
      // isDeleted 플래그가 true인 문서는 제외
      const products = await db
        .collection<ProductDoc>("products")
        .find({ isDeleted: { $ne: true } })
        .toArray();

      const initialsQuery = getHangulInitials(query);
      const isChosungOnly = /^[ㄱ-ㅎ]+$/.test(query); // 초성만 입력된 경우

      const filtered = products.filter((product) => {
        const name = product.name ?? "";
        const nameInitials = getHangulInitials(name);

        if (isChosungOnly) {
          // 초성 검색일 경우
          return nameInitials.includes(initialsQuery);
        } else {
          // 일반 문자열 검색일 경우
          return name.includes(query);
        }
      });
      return NextResponse.json(
        filtered.slice(0, 10).map((product) => ({
          _id: product._id.toString(),
          name: product.name,
          price: product.price,
          image: product.images?.[0] ?? null,
        })),
      );
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

    // 페이징
    const page = Math.max(1, Number(params.get("page") || "1"));
    const limit = Math.min(100, Number(params.get("limit") || "12"));
    const skip = (page - 1) * limit;

    const filter: Filter<ProductDoc> = { isDeleted: { $ne: true } }; // Soft-Delete된 상품은 기본적으로 제외
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
    if (q) filter.name = { $regex: q, $options: "i" };
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
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<ProductDoc>("products");

    let sortObj: { [key: string]: 1 | -1 } = { _id: -1 };

    if (sort === "price-low") sortObj = { price: 1 };
    else if (sort === "price-high") sortObj = { price: -1 };
    else if (sort === "reviews-desc") sortObj = { ratingCount: -1, ratingAvg: -1, _id: -1 };

    const idFilter =
      exclude && ObjectId.isValid(exclude)
        ? { _id: { $ne: new ObjectId(exclude) } }
        : {};
    const composed = { ...filter, ...idFilter };

    const [total, itemsRaw] = await Promise.all([
      collection.countDocuments(composed),
      collection.find(composed).sort(sortObj).skip(skip).limit(limit).toArray(),
    ]);

    const items = itemsRaw.map((product) => ({
      ...product,
      _id: product._id.toString(),
    }));

    const hasMore = skip + items.length < total;

    return NextResponse.json({
      products: items,
      pagination: { page, limit, total, hasMore },
    });
  } catch (err) {
    console.error("[상품 리스트 조회 오류]", err);
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}
