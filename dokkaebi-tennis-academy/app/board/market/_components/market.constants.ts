// 중고거래 게시판 전용 상수/유틸

export type MarketCategory = 'racket' | 'string' | 'equipment';

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

const BRAND_LABEL_MAP: Record<string, string> = Object.fromEntries([...MARKET_BRANDS_BY_CATEGORY.racket.map((o) => [o.value, o.label] as const), ...MARKET_BRANDS_BY_CATEGORY.string.map((o) => [o.value, o.label] as const)]);

export function getMarketBrandOptions(category: MarketCategory | 'all' | null | undefined) {
  if (category === 'racket') return MARKET_BRANDS_BY_CATEGORY.racket;
  if (category === 'string') return MARKET_BRANDS_BY_CATEGORY.string;
  return [];
}

export function getMarketBrandLabel(brand?: string | null) {
  if (!brand) return '';
  return BRAND_LABEL_MAP[brand] ?? brand;
}

export function isValidMarketBrandForCategory(category: MarketCategory, brand: string) {
  const opts = getMarketBrandOptions(category).map((o) => o.value);
  return opts.includes(brand as any);
}

export function isMarketBrandCategory(category: string): category is 'racket' | 'string' {
  return category === 'racket' || category === 'string';
}

// 라켓/스트링에서만 브랜드 필수
export const isBrandRequiredCategory = (category: string | null | undefined) => category === 'racket' || category === 'string';
