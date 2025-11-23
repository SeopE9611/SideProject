export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret';

// 초 단위 (JWT와 쿠키 모두에 사용 가능)
export const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // 1시간
export const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7일

// 은행
export const bankLabelMap: Record<string, { label: string; account: string; holder: string }> = {
  shinhan: {
    label: '신한은행',
    account: '123-456-789012',
    holder: '도깨비테니스',
  },
  kookmin: {
    label: '국민은행',
    account: '123-45-6789-012',
    holder: '도깨비테니스',
  },
  woori: {
    label: '우리은행',
    account: '1234-567-890123',
    holder: '도깨비테니스',
  },
};

// 라켓 브랜드
export type RacketBrand = 'head' | 'wilson' | 'babolat' | 'tecnifibre';

export const RACKET_BRANDS = [
  { value: 'head', label: '헤드' },
  { value: 'wilson', label: '윌슨' },
  { value: 'babolat', label: '바볼랏' },
  { value: 'tecnifibre', label: '테크니화이버' },
] as const;

export const racketBrandLabel = (v?: string) => RACKET_BRANDS.find((b) => b.value === v)?.label ?? v ?? '';

// 스트링 브랜드
export const STRING_BRANDS = [
  { value: 'luxilon', label: '럭실론' },
  { value: 'tecnifibre', label: '테크니화이버' },
  { value: 'wilson', label: '윌슨' },
  { value: 'babolat', label: '바볼랏' },
  { value: 'head', label: '헤드' },
  { value: 'yonex', label: '요넥스' },
  { value: 'solinco', label: '솔린코' },
  { value: 'dunlop', label: '던롭' },
] as const;

export const stringBrandLabel = (v?: string) => STRING_BRANDS.find((b) => b.value === (v ?? '').toLowerCase())?.label ?? v ?? '';
