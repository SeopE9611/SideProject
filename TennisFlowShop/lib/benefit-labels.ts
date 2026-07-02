export const BENEFIT_FILTER_VALUES = ["featured", "new", "sale"] as const;
export type BenefitFilterValue = (typeof BENEFIT_FILTER_VALUES)[number];

export const BENEFIT_LABELS: Record<BenefitFilterValue, string> = {
  featured: "추천",
  new: "신상품",
  sale: "할인",
};

export function parseBenefitFilters(value?: string | null): BenefitFilterValue[] {
  if (!value || value === "all") return [];
  const seen = new Set<BenefitFilterValue>();
  value.split(",").forEach((part) => {
    const normalized = part.trim();
    if (BENEFIT_FILTER_VALUES.includes(normalized as BenefitFilterValue)) {
      seen.add(normalized as BenefitFilterValue);
    }
  });
  return BENEFIT_FILTER_VALUES.filter((item) => seen.has(item));
}

export function serializeBenefitFilters(values: readonly string[]): string | null {
  const parsed = parseBenefitFilters(values.join(","));
  return parsed.length > 0 ? parsed.join(",") : null;
}

export function formatBenefitFilterLabel(values: readonly string[]) {
  return parseBenefitFilters(values.join(","))
    .map((value) => BENEFIT_LABELS[value])
    .join("·");
}
