import { getDb } from "@/lib/mongodb";

type MaterialKey = "polyester" | "syntheticGut" | "naturalGut" | "other";

type ProductLite = {
  name?: string;
  brand?: string;
  material?: string;
  price?: number;
  mountingFee?: number;
  isDeleted?: boolean;
};

export type MaterialSummary = {
  key: MaterialKey;
  label: string;
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
  minMountingFee: number | null;
  maxMountingFee: number | null;
  brands: string[];
  productNames: string[];
};

export type HybridGuideSummary = {
  count: number;
  representativeMaterials: string[];
  representativeProducts: string[];
};

const CATEGORY_META: Record<MaterialKey, { label: string }> = {
  polyester: { label: "폴리에스터" },
  syntheticGut: { label: "인조쉽 / 멀티필라멘트" },
  naturalGut: { label: "내추럴 거트" },
  other: { label: "기타/미분류" },
};

const PRIMARY_MATERIAL_KEYS: MaterialKey[] = [
  "polyester",
  "syntheticGut",
  "naturalGut",
];

function isHybridMaterial(material: string | undefined): boolean {
  const value = String(material ?? "").toLowerCase();
  if (!value) return false;

  if (value.includes("hybrid") || value.includes("하이브리드")) return true;

  const separators = ["/", "+", "&"];
  const hasSeparator = separators.some((separator) =>
    value.includes(separator),
  );
  const hasPoly = value.includes("poly") || value.includes("폴리");
  const hasMulti =
    value.includes("multi") ||
    value.includes("멀티") ||
    value.includes("인조") ||
    value.includes("synthetic");
  const hasGut =
    value.includes("gut") ||
    value.includes("거트") ||
    value.includes("내추럴") ||
    value.includes("natural");

  return (
    hasSeparator && [hasPoly, hasMulti, hasGut].filter(Boolean).length >= 2
  );
}

function toMaterialKey(material: string | undefined): MaterialKey {
  const value = String(material ?? "").toLowerCase();
  if (
    value.includes("natural") ||
    value.includes("내추럴") ||
    value.includes("천연")
  )
    return "naturalGut";
  if (
    (value.includes("gut") || value.includes("거트")) &&
    !(value.includes("synthetic") || value.includes("인조"))
  )
    return "naturalGut";
  if (
    value.includes("synthetic") ||
    value.includes("인조") ||
    value.includes("multi") ||
    value.includes("멀티")
  )
    return "syntheticGut";
  if (value.includes("poly") || value.includes("폴리")) return "polyester";
  return "other";
}

async function fetchStringingProducts(): Promise<ProductLite[]> {
  try {
    const db = await getDb();
    return await db
      .collection<ProductLite>("products")
      .find(
        { isDeleted: { $ne: true }, mountingFee: { $gt: 0 } },
        {
          projection: {
            name: 1,
            brand: 1,
            material: 1,
            price: 1,
            mountingFee: 1,
          },
        },
      )
      .toArray();
  } catch {
    return [];
  }
}

export async function getStringingMaterialSummaries(): Promise<
  MaterialSummary[]
> {
  const products = await fetchStringingProducts();

  const grouped = new Map<MaterialKey, ProductLite[]>();
  for (const p of products) {
    if (isHybridMaterial(p.material)) continue;
    const key = toMaterialKey(p.material);
    const bucket = grouped.get(key) ?? [];
    bucket.push(p);
    grouped.set(key, bucket);
  }

  return (Object.keys(CATEGORY_META) as MaterialKey[]).map((key) => {
    const rows = grouped.get(key) ?? [];
    const prices = rows
      .map((r) => Number(r.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    const fees = rows
      .map((r) => Number(r.mountingFee))
      .filter((n) => Number.isFinite(n) && n > 0);

    const brandCounter = new Map<string, number>();
    for (const row of rows) {
      const brand = String(row.brand ?? "").trim();
      if (!brand) continue;
      brandCounter.set(brand, (brandCounter.get(brand) ?? 0) + 1);
    }

    const brands = [...brandCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      key,
      label: CATEGORY_META[key].label,
      count: rows.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      minMountingFee: fees.length ? Math.min(...fees) : null,
      maxMountingFee: fees.length ? Math.max(...fees) : null,
      brands,
      productNames: rows
        .map((r) => String(r.name ?? "").trim())
        .filter(Boolean)
        .slice(0, 3),
    };
  });
}

export async function getHybridGuideSummary(): Promise<HybridGuideSummary> {
  const products = await fetchStringingProducts();
  const hybridRows = products.filter((row) => isHybridMaterial(row.material));

  const materialCounter = new Map<string, number>();
  for (const row of hybridRows) {
    const material = String(row.material ?? "").trim();
    if (!material) continue;
    materialCounter.set(material, (materialCounter.get(material) ?? 0) + 1);
  }

  return {
    count: hybridRows.length,
    representativeMaterials: [...materialCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([material]) => material),
    representativeProducts: hybridRows
      .map((row) => String(row.name ?? "").trim())
      .filter(Boolean)
      .slice(0, 3),
  };
}

export async function getStringingPricingView() {
  const [summaries, hybridGuide] = await Promise.all([
    getStringingMaterialSummaries(),
    getHybridGuideSummary(),
  ]);
  return {
    primarySummaries: summaries.filter((summary) =>
      PRIMARY_MATERIAL_KEYS.includes(summary.key),
    ),
    otherSummary: summaries.find((summary) => summary.key === "other") ?? null,
    hybridGuide,
  };
}
