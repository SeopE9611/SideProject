export const PRODUCT_FEATURE_ITEMS = [
  { key: "power", label: "반발력" },
  { key: "control", label: "컨트롤" },
  { key: "spin", label: "스핀" },
  { key: "durability", label: "내구성" },
  { key: "comfort", label: "편안함" },
] as const;

export type ProductFeatureKey = (typeof PRODUCT_FEATURE_ITEMS)[number]["key"];

export function normalizeFeatureScoreTo100(value: unknown, fallback = 60): number {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  if (n >= 1 && n <= 5) return Math.round(n * 20);

  return Math.min(100, Math.max(1, Math.round(n)));
}

export function normalizeFeatureScoresTo100(
  features: Record<string, unknown> | undefined,
  fallback = 60,
): Record<ProductFeatureKey, number> {
  return {
    power: normalizeFeatureScoreTo100(features?.power ?? features?.["반발력"], fallback),
    control: normalizeFeatureScoreTo100(features?.control ?? features?.["컨트롤"], fallback),
    spin: normalizeFeatureScoreTo100(features?.spin ?? features?.["스핀"], fallback),
    durability: normalizeFeatureScoreTo100(features?.durability ?? features?.["내구성"], fallback),
    comfort: normalizeFeatureScoreTo100(features?.comfort ?? features?.["편안함"], fallback),
  };
}
