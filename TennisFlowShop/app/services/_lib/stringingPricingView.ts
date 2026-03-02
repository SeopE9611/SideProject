import { getDb } from '@/lib/mongodb';

type MaterialKey = 'polyester' | 'multifilament' | 'hybrid' | 'other';

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

const CATEGORY_META: Record<MaterialKey, { label: string }> = {
  polyester: { label: '폴리에스터' },
  multifilament: { label: '멀티필라멘트' },
  hybrid: { label: '하이브리드' },
  other: { label: '기타/미분류' },
};

function toMaterialKey(material: string | undefined): MaterialKey {
  const value = String(material ?? '').toLowerCase();
  if (value.includes('poly') || value.includes('폴리')) return 'polyester';
  if (value.includes('multi') || value.includes('멀티')) return 'multifilament';
  if (value.includes('hybrid') || value.includes('하이브리드')) return 'hybrid';
  return 'other';
}

export async function getStringingMaterialSummaries(): Promise<MaterialSummary[]> {
  let products: ProductLite[] = [];

  try {
    const db = await getDb();
    products = await db
.collection<ProductLite>('products')
      .find({ isDeleted: { $ne: true }, mountingFee: { $gt: 0 } }, { projection: { name: 1, brand: 1, material: 1, price: 1, mountingFee: 1 } })
      .toArray();
  } catch {
    products = [];
  }

  const grouped = new Map<MaterialKey, ProductLite[]>();
  for (const p of products) {
    const key = toMaterialKey(p.material);
    const bucket = grouped.get(key) ?? [];
    bucket.push(p);
    grouped.set(key, bucket);
  }

  return (Object.keys(CATEGORY_META) as MaterialKey[]).map((key) => {
    const rows = grouped.get(key) ?? [];
    const prices = rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n) && n > 0);
    const fees = rows.map((r) => Number(r.mountingFee)).filter((n) => Number.isFinite(n) && n > 0);

    const brandCounter = new Map<string, number>();
    for (const row of rows) {
      const brand = String(row.brand ?? '').trim();
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
      productNames: rows.map((r) => String(r.name ?? '').trim()).filter(Boolean).slice(0, 3),
    };
  });
}
