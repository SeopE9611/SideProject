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
export const RACKET_BRANDS = [
  { value: 'head', label: '헤드' },
  { value: 'wilson', label: '윌슨' },
  { value: 'babolat', label: '바볼랏' },
  // { value: 'yonex', label: '요넥스' },
  // { value: 'dunlop', label: '던롭' },
  // { value: 'prince', label: '프린스' },
  { value: 'tecnifibre', label: '테크니화이버' },
  { value: 'other', label: '기타' },
] as const;

export type RacketBrand = (typeof RACKET_BRANDS)[number]['value'];

export const racketBrandLabel = (v?: string) => {
  const key = (v ?? '').toLowerCase();
  return RACKET_BRANDS.find((b) => b.value === key)?.label ?? v ?? '';
};
// 라켓 파인더(스펙 필터)용 스트링 패턴 목록
// - 서버/DB에서는 `16x19` 같은 형태로 저장/조회(×, 공백 제거 후 x로 통일)하는 전제를 둔다.
export const STRING_PATTERNS = ['16x19', '16x18', '18x20', '18x19', '16x20', '16x17', '18x16', '14x18', '14x16', '18x18', '14x21'] as const;
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

// 정규화
export function normalizeStringPattern(p: string) {
  return String(p ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[×]/g, 'x')
    .toLowerCase();
}
