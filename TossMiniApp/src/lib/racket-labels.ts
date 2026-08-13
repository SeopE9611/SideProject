export const RACKET_BRANDS = [
  { value: "head", label: "헤드" },
  { value: "wilson", label: "윌슨" },
  { value: "babolat", label: "바볼랏" },
  { value: "yonex", label: "요넥스" },
  { value: "dunlop", label: "던롭" },
  { value: "prince", label: "프린스" },
  { value: "tecnifibre", label: "테크니화이버" },
  { value: "other", label: "기타" },
] as const;

export function racketBrandLabel(value?: string) {
  const key = String(value ?? "").trim().toLowerCase();
  return RACKET_BRANDS.find((brand) => brand.value === key)?.label ?? value ?? "";
}

export function racketConditionLabel(value?: string) {
  return ({ A: "A · 최상", B: "B · 양호", C: "C · 보통" } as Record<string, string>)[
    String(value ?? "").toUpperCase()
  ] ?? value ?? "상태 확인";
}

export function stringPatternLabel(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\s*[x×]\s*/, "x");
  if (normalized === "16x19") return "16x19 (오픈패턴)";
  if (normalized === "18x20") return "18x20 (덴스패턴)";
  return normalized || value || "";
}

export function gripSizeLabel(value?: string) {
  const normalized = String(value ?? "").trim().toUpperCase();
  const labels: Record<string, string> = {
    G1: "1그립 4 1/8",
    G2: "2그립 4 1/4",
    G3: "3그립 4 3/8",
  };
  return labels[normalized] ?? value ?? "";
}

export function validRacketSalePrice(price?: number, marketing?: { isSale?: boolean; salePrice?: number }) {
  return marketing?.isSale === true && Number.isFinite(price) && Number.isFinite(marketing.salePrice) &&
    Number(marketing.salePrice) > 0 && Number(marketing.salePrice) < Number(price)
    ? Number(marketing.salePrice)
    : null;
}
