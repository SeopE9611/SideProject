// 중고거래 게시판 전용 상수/타입/정규화 유틸

export type MarketCategory = 'racket' | 'string' | 'equipment';
export type SaleStatus = 'selling' | 'reserved' | 'sold';
export type ConditionGrade = 'S' | 'A' | 'B' | 'C';

export type MarketRacketSpec = {
  modelName: string;
  year?: number | null;
  weight?: number | null;
  balance?: number | null;
  headSize?: number | null;
  lengthIn?: number | null;
  swingWeight?: number | null;
  stiffnessRa?: number | null;
  pattern?: string | null;
  gripSize?: string | null;
};

export type MarketStringSpec = {
  modelName: string;
  material?: string | null;
  gauge?: string | null;
  color?: string | null;
  length?: string | null;
};

export type MarketMeta = {
  price: number | null;
  saleStatus: SaleStatus;
  conditionGrade: ConditionGrade;
  conditionNote?: string | null;
  racketSpec?: MarketRacketSpec | null;
  stringSpec?: MarketStringSpec | null;
};

export const MARKET_CATEGORY_OPTIONS = [
  { value: 'racket', label: '라켓' },
  { value: 'string', label: '스트링' },
  { value: 'equipment', label: '일반장비' },
] as const;

export const MARKET_BRANDS_BY_CATEGORY = {
  racket: [
    { value: 'head', label: '헤드' },
    { value: 'babolat', label: '바볼랏' },
    { value: 'wilson', label: '윌슨' },
    { value: 'yonex', label: '요넥스' },
    { value: 'tecnifibre', label: '테크니화이버' },
    { value: 'etc', label: '그외기타' },
  ],
  string: [
    { value: 'wilson', label: '윌슨' },
    { value: 'luxilon', label: '럭실론' },
    { value: 'msv', label: 'MSV' },
    { value: 'topspin', label: '탑스핀' },
    { value: 'yonex', label: '요넥스' },
    { value: 'gayonSports', label: '가연스포츠' },
    { value: 'volkl', label: '뵐클' },
    { value: 'etc', label: '그외기타' },
  ],
} as const;

export const MARKET_SALE_STATUS_OPTIONS = [
  { value: 'selling', label: '판매중' },
  { value: 'reserved', label: '예약중' },
  { value: 'sold', label: '판매완료' },
] as const;

export const MARKET_CONDITION_GRADE_OPTIONS = [
  { value: 'S', label: 'S (미개봉/새상품급)' },
  { value: 'A', label: 'A (사용감 적음)' },
  { value: 'B', label: 'B (일반 사용감)' },
  { value: 'C', label: 'C (사용감 많음)' },
] as const;

export const MARKET_RACKET_PATTERN_OPTIONS = ['16x19', '18x20', '16x18', '16x20', '18x19', '기타'] as const;
export const MARKET_RACKET_GRIP_SIZE_OPTIONS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;

export const MARKET_STRING_MATERIAL_OPTIONS = ['poly', 'poly-rough', 'multifilament', 'synthetic-gut', 'natural-gut', 'hybrid', '기타'] as const;
export const MARKET_STRING_GAUGE_OPTIONS = ['1.15', '1.20', '1.23', '1.25', '1.27', '1.30', '1.35', '기타'] as const;
export const MARKET_STRING_COLOR_OPTIONS = ['white', 'black', 'silver', 'blue', 'red', 'yellow', 'green', 'orange', 'pink', 'purple', '기타'] as const;
export const MARKET_STRING_LENGTH_OPTIONS = ['12m', '12.2m', '200m', '220m', '기타'] as const;

export const MARKET_BRAND_LABEL_MAP: Record<string, string> = Object.fromEntries([...MARKET_BRANDS_BY_CATEGORY.racket.map((o) => [o.value, o.label] as const), ...MARKET_BRANDS_BY_CATEGORY.string.map((o) => [o.value, o.label] as const)]);
export const MARKET_SALE_STATUS_LABEL_MAP: Record<SaleStatus, string> = Object.fromEntries(MARKET_SALE_STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<SaleStatus, string>;
export const MARKET_CONDITION_GRADE_LABEL_MAP: Record<ConditionGrade, string> = Object.fromEntries(MARKET_CONDITION_GRADE_OPTIONS.map((o) => [o.value, o.label])) as Record<ConditionGrade, string>;

export function getMarketBrandOptions(category: MarketCategory | 'all' | null | undefined) {
  if (category === 'racket') return MARKET_BRANDS_BY_CATEGORY.racket;
  if (category === 'string') return MARKET_BRANDS_BY_CATEGORY.string;
  return [];
}

export function getMarketBrandLabel(brand?: string | null) {
  if (!brand) return '';
  return MARKET_BRAND_LABEL_MAP[brand] ?? brand;
}

export function isMarketBrandCategory(category: string | null | undefined): category is 'racket' | 'string' {
  return category === 'racket' || category === 'string';
}

export function isValidMarketBrandForCategory(category: MarketCategory, brand: string) {
  return getMarketBrandOptions(category)
    .map((o) => o.value)
    .includes(brand as any);
}

export const isBrandRequiredCategory = (category: string | null | undefined) => category === 'racket' || category === 'string';

export function toSafeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function normalizeMarketMeta(category: string | null | undefined, meta: any): MarketMeta | null {
  if (!meta || typeof meta !== 'object') return null;

  const price = toSafeNumber(meta.price);
  const saleStatus = meta.saleStatus;
  const conditionGrade = meta.conditionGrade;
  if (!(saleStatus === 'selling' || saleStatus === 'reserved' || saleStatus === 'sold')) return null;
  if (!(conditionGrade === 'S' || conditionGrade === 'A' || conditionGrade === 'B' || conditionGrade === 'C')) return null;

  const base: MarketMeta = {
    price,
    saleStatus,
    conditionGrade,
    conditionNote: typeof meta.conditionNote === 'string' ? meta.conditionNote.trim() || null : null,
    racketSpec: null,
    stringSpec: null,
  };

  if (category === 'racket' && meta.racketSpec && typeof meta.racketSpec === 'object') {
    const modelName = String(meta.racketSpec.modelName ?? '').trim();
    base.racketSpec = {
      modelName,
      year: toSafeNumber(meta.racketSpec.year),
      weight: toSafeNumber(meta.racketSpec.weight),
      balance: toSafeNumber(meta.racketSpec.balance),
      headSize: toSafeNumber(meta.racketSpec.headSize),
      lengthIn: toSafeNumber(meta.racketSpec.lengthIn),
      swingWeight: toSafeNumber(meta.racketSpec.swingWeight),
      stiffnessRa: toSafeNumber(meta.racketSpec.stiffnessRa),
      pattern: meta.racketSpec.pattern ? String(meta.racketSpec.pattern) : null,
      gripSize: meta.racketSpec.gripSize ? String(meta.racketSpec.gripSize) : null,
    };
  }

  if (category === 'string' && meta.stringSpec && typeof meta.stringSpec === 'object') {
    const modelName = String(meta.stringSpec.modelName ?? '').trim();
    base.stringSpec = {
      modelName,
      material: meta.stringSpec.material ? String(meta.stringSpec.material) : null,
      gauge: meta.stringSpec.gauge ? String(meta.stringSpec.gauge) : null,
      color: meta.stringSpec.color ? String(meta.stringSpec.color) : null,
      length: meta.stringSpec.length ? String(meta.stringSpec.length) : null,
    };
  }

  return base;
}
