const STRING_BRAND_LABELS: Record<string, string> = {
  luxilon: "럭실론",
  tecnifibre: "테크니화이버",
  wilson: "윌슨",
  babolat: "바볼랏",
  head: "헤드",
  yonex: "요넥스",
  solinco: "솔린코",
  dunlop: "던롭",
  msv: "MSV",
  volkl: "볼키",
  topspin: "탑스핀",
  other: "기타",
};

const STRING_MATERIAL_LABELS: Record<string, string> = {
  polyester: "폴리에스터",
  multifilament: "멀티필라멘트",
  monofilament: "모노필라멘트",
  natural_gut: "천연 거트",
  synthetic_gut: "합성 거트",
  hybrid: "하이브리드",
};

function normalizeLabelKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function getStringBrandLabel(value?: string | null) {
  const key = normalizeLabelKey(value);
  return STRING_BRAND_LABELS[key] ?? value ?? "";
}

export function getStringMaterialLabel(value?: string | null) {
  const key = normalizeLabelKey(value);
  return STRING_MATERIAL_LABELS[key] ?? value ?? "";
}

export function formatPrice(price: number | undefined) {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return "가격 정보 없음";
  }

  return `${price.toLocaleString("ko-KR")}원`;
}

export function isEnabledFlag(value: boolean | string | number | undefined) {
  return value === true || value === "true" || value === 1;
}

export function toFiniteNumber(value: number | string | null | undefined): number | null {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function normalizeFeatureScoreTo100(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  if (number >= 1 && number <= 5) {
    return Math.round(number * 20);
  }

  return Math.min(100, Math.max(1, Math.round(number)));
}

const STRING_COLOR_LABELS: Record<
  string,
  string
> = {
  black: "블랙",
  white: "화이트",
  red: "레드",
  blue: "블루",
  yellow: "옐로우",
  green: "그린",
  orange: "오렌지",
  brown: "브라운",
  gray: "그레이",
  natural: "내추럴",
  pink: "핑크",
  purple: "퍼플",
  silver: "실버",
  gold: "골드",
  transparent: "투명",
};

export function getStringColorLabel(
  value?: string | null,
) {
  const key =
    normalizeLabelKey(value);

  return (
    STRING_COLOR_LABELS[key] ??
    value ??
    ""
  );
}

export function formatGaugeLabel(
  value?: string | null,
) {
  const raw = String(
    value ?? "",
  ).trim();

  if (!raw) {
    return "";
  }

  if (/mm/i.test(raw)) {
    return raw;
  }

  return `${raw}mm`;
}
