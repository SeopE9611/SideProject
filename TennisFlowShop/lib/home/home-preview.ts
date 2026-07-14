import { productVisibilityFilterFor, racketVisibilityFilterFor } from "@/lib/public-visibility";
import "server-only";

import { unstable_cache } from "next/cache";
import { ObjectId, type Filter, type Sort } from "mongodb";

import { getBoardList } from "@/lib/boards.queries";
import { buildCommunityListMongoFilter, getCommunitySortOption } from "@/lib/community-list-query";
import { getDb } from "@/lib/mongodb";
import { loadPackageSettings } from "@/app/features/packages/api/db";

type ProductFeatures = {
  power?: number;
  control?: number;
  spin?: number;
  durability?: number;
  comfort?: number;
};

export type HomePreviewProduct = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  isNew?: boolean | string | number;
  material?: "polyester" | "hybrid" | string;
  features?: ProductFeatures;
  inventory?: {
    isFeatured?: boolean | string | number;
    isNew?: boolean | string | number;
    isSale?: boolean | string | number;
    salePrice?: number | string | null;
    status?: "instock" | "outofstock" | "backorder" | string;
    stock?: number | string | null;
    lowStock?: number | string | null;
    manageStock?: boolean | string | number;
    allowBackorder?: boolean | string | number;
  };
};

export type HomePreviewRacket = {
  id: string;
  brand: string;
  model: string;
  price: number;
  images?: string[];
  condition?: "A" | "B" | "C" | "D";
  rental?: {
    enabled: boolean;
    deposit?: number;
    fee?: { d7?: number; d15?: number; d30?: number };
  };
  marketing?: {
    isFeatured?: boolean;
    isNew?: boolean;
    isSale?: boolean;
    salePrice?: number;
  };
};

export type HomePreviewNotice = {
  _id: string;
  title: string;
  createdAt: string;
};

export type HomePreviewMarketPost = {
  id: string;
  title: string;
  createdAt: string;
};

export type HomePreviewPackage = {
  id: string;
  name: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  validityDays: number;
  description: string;
};

export type HomePreviewData = {
  products?: { items: HomePreviewProduct[]; total: number };
  rackets?: { items: HomePreviewRacket[]; total: number };
  notices?: HomePreviewNotice[];
  marketPosts?: HomePreviewMarketPost[];
  packages?: HomePreviewPackage[];
};

type ProductDoc = {
  _id: ObjectId;
  name?: string;
  price?: number;
  images?: string[];
  brand?: string;
  isNew?: boolean | string | number;
  material?: "polyester" | "hybrid" | string;
  features?: ProductFeatures;
  inventory?: HomePreviewProduct["inventory"];
  isDeleted?: boolean;
};

const HOME_PREVIEW_CACHE_TAG = "home-preview";
const HOME_PREVIEW_REVALIDATE_SECONDS = 60;

type RacketDoc = {
  _id: ObjectId;
  brand?: string;
  model?: string;
  price?: number;
  images?: string[];
  condition?: "A" | "B" | "C" | "D";
  rental?: HomePreviewRacket["rental"];
  marketing?: HomePreviewRacket["marketing"];
  status?: string;
};

const normalizeRacketMarketing = (value: unknown) => {
  const marketing =
    value && typeof value === "object" ? (value as HomePreviewRacket["marketing"]) : undefined;

  return {
    isFeatured: marketing?.isFeatured === true,
    isNew: marketing?.isNew === true,
    isSale: marketing?.isSale === true,
    salePrice: Math.max(0, Number(marketing?.salePrice ?? 0) || 0),
  };
};

const toIsoString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
};

async function loadProducts() {
  const db = await getDb();
  const filter: Filter<ProductDoc> = productVisibilityFilterFor();
  const collection = db.collection<ProductDoc>("products");
  const projection = {
    name: 1,
    price: 1,
    images: 1,
    brand: 1,
    isNew: 1,
    material: 1,
    features: 1,
    "inventory.isFeatured": 1,
    "inventory.isNew": 1,
    "inventory.isSale": 1,
    "inventory.salePrice": 1,
    "inventory.status": 1,
    "inventory.stock": 1,
    "inventory.lowStock": 1,
    "inventory.manageStock": 1,
    "inventory.allowBackorder": 1,
  };
  const [total, docs] = await Promise.all([
    collection.countDocuments(filter),
    collection.find(filter, { projection }).sort({ _id: -1 }).limit(10).toArray(),
  ]);

  return {
    items: docs.map((product) => ({
      _id: product._id.toString(),
      name: product.name ?? "",
      price: product.price ?? 0,
      images: product.images,
      brand: product.brand,
      isNew: product.isNew,
      material: product.material,
      features: product.features,
      inventory: product.inventory,
    })),
    total,
  };
}

async function loadRackets() {
  const db = await getDb();
  const filter: Filter<RacketDoc> = { ...racketVisibilityFilterFor() };
  const sort: Sort = { createdAt: -1, _id: -1 };
  const collection = db.collection<RacketDoc>("used_rackets");
  const projection = {
    brand: 1,
    model: 1,
    price: 1,
    condition: 1,
    images: 1,
    status: 1,
    rental: 1,
    marketing: 1,
  };
  const [docs, total] = await Promise.all([
    collection.find(filter, { projection }).sort(sort).limit(10).toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    items: docs.map((racket) => {
      const { _id, ...rest } = racket;
      return {
        ...rest,
        brand: rest.brand ?? "",
        model: rest.model ?? "",
        price: rest.price ?? 0,
        marketing: normalizeRacketMarketing(rest.marketing),
        id: _id.toString(),
      };
    }),
    total,
  };
}

async function loadNotices() {
  const { items } = await getBoardList({
    type: "notice",
    page: 1,
    limit: 5,
    excludeCategory: "이벤트",
  });

  return items.map((notice) => ({
    _id: notice._id,
    title: notice.title,
    createdAt: toIsoString(notice.createdAt),
  }));
}

async function loadMarketPosts() {
  const db = await getDb();
  const filter = buildCommunityListMongoFilter({
    typeParam: "market",
    brand: null,
    q: "",
    escapedQ: "",
    authorObjectId: null,
    searchType: "title_content",
    category: null,
    marketFilters: {
      saleStatus: null,
      conditionGrade: null,
      minPrice: null,
      maxPrice: null,
      modelKeyword: null,
      gripSize: null,
      pattern: null,
      material: null,
      gauge: null,
      color: null,
      length: null,
      minWeight: null,
      maxWeight: null,
      minBalance: null,
      maxBalance: null,
      minHeadSize: null,
      maxHeadSize: null,
      minSwingWeight: null,
      maxSwingWeight: null,
      minStiffnessRa: null,
      maxStiffnessRa: null,
    },
  });
  const docs = await db
    .collection("community_posts")
    .find(filter, { projection: { title: 1, createdAt: 1 } })
    .sort(getCommunitySortOption("latest"))
    .limit(5)
    .toArray();

  return docs.map((post) => ({
    id: String(post._id),
    title: typeof post.title === "string" ? post.title : "",
    createdAt: toIsoString(post.createdAt),
  }));
}

async function loadPackages(): Promise<HomePreviewPackage[]> {
  const { packageConfigs } = await loadPackageSettings();

  return packageConfigs
    .filter((pkg) => pkg.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3)
    .map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      sessions: pkg.sessions,
      price: pkg.price,
      originalPrice: pkg.originalPrice,
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder,
      validityDays: pkg.validityDays,
      description: pkg.description,
    }));
}

async function safe<T>(source: string, loader: () => Promise<T>) {
  try {
    return await loader();
  } catch (error) {
    console.error(`[home-preview] failed to load initial data: ${source}`, error);
    return undefined;
  }
}

async function loadHomePreviewData(): Promise<HomePreviewData | null> {
  // 홈 공개 미리보기 데이터는 사용자별 쿠키/인증과 무관하므로 서버에서 짧게 캐시해
  // 첫 진입 후 클라이언트 중복 fetch 의존도를 낮춘다.
  const [products, rackets, notices, packages] = await Promise.all([
    safe("products", loadProducts),
    safe("rackets", loadRackets),
    safe("notices", loadNotices),
    safe("packages", loadPackages),
  ]);

  if (!products && !rackets && !notices && !packages) return null;
  return { products, rackets, notices, packages };
}

export const getHomePreviewData = unstable_cache(loadHomePreviewData, ["home-preview-public-v2"], {
  revalidate: HOME_PREVIEW_REVALIDATE_SECONDS,
  tags: [HOME_PREVIEW_CACHE_TAG],
});
