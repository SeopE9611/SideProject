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
    holder: '테니스플로우',
  },
  kookmin: {
    label: '국민은행',
    account: '123-45-6789-012',
    holder: '테니스플로우',
  },
  woori: {
    label: '우리은행',
    account: '1234-567-890123',
    holder: '테니스플로우',
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
// 라켓 검색/등록/수정에서 공통으로 쓰는 스트링 패턴 옵션
// - value: DB 저장값(짧고 일관된 표준값)
// - label: 화면 표시용 텍스트
export const STRING_PATTERN_OPTIONS = [
  { value: '16x17', label: '16x17' },
  { value: '16x18', label: '16x18' },
  { value: '16x19', label: '16x19 (오픈패턴)' },
  { value: '16x20', label: '16x20' },
  { value: '18x16', label: '18x16' },
  { value: '18x19', label: '18x19' },
  { value: '18x20', label: '18x20 (덴스패턴)' },
] as const;

export type StringPatternValue = (typeof STRING_PATTERN_OPTIONS)[number]['value'];

export const STRING_PATTERNS = STRING_PATTERN_OPTIONS.map((option) => option.value) as readonly StringPatternValue[];

// 그립 사이즈도 value/label 분리 구조로 통일
export const GRIP_SIZE_OPTIONS = [
  { value: 'G1', label: '1그립 4 1/8' },
  { value: 'G2', label: '2그립 4 1/4' },
  { value: 'G3', label: '3그립 4 3/8' },
] as const;

export type GripSizeValue = (typeof GRIP_SIZE_OPTIONS)[number]['value'];

// 자유입력으로 저장된 과거값을 최대한 살리기 위한 별칭 테이블
const GRIP_SIZE_ALIASES: Record<GripSizeValue, readonly string[]> = {
  G1: ['g1', '1grip', '1 grip', '1그립', '1 그립', '1그립 4 1/8', '1 그립 4 1/8', '1그립4 1/8', '4 1/8', '4-1/8', '4.125', '4⅛'],
  G2: ['g2', '2grip', '2 grip', '2그립', '2 그립', '2그립 4 1/4', '2 그립 4 1/4', '2그립4 1/4', '4 1/4', '4-1/4', '4.25', '4¼'],
  G3: ['g3', '3grip', '3 grip', '3그립', '3 그립', '3그립 4 3/8', '3 그립 4 3/8', '3그립4 3/8', '4 3/8', '4-3/8', '4.375', '4⅜'],
};

const STRING_PATTERN_SET = new Set<StringPatternValue>(STRING_PATTERNS);
const GRIP_SIZE_SET = new Set<GripSizeValue>(GRIP_SIZE_OPTIONS.map((option) => option.value));
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

// 저장 전 패턴 정규화 + 허용값 검증
export function normalizeAndValidateStringPattern(p: string): StringPatternValue | '' {
  const normalized = normalizeStringPattern(p);
  return STRING_PATTERN_SET.has(normalized as StringPatternValue) ? (normalized as StringPatternValue) : '';
}

export function stringPatternLabel(v?: string) {
  // 화면 렌더링 단계에서도 한 번 더 정규화해서
  // '16X19', '16 x 19' 같은 과거/혼합 표기를 최대한 동일 라벨로 보여준다.
  const normalized = normalizeAndValidateStringPattern(String(v ?? ''));
  if (normalized) {
    return STRING_PATTERN_OPTIONS.find((option) => option.value === normalized)?.label ?? normalized;
  }
  return v ?? '';
}

// 그립 사이즈 자유입력값을 최대한 G1/G2/G3로 정규화
export function normalizeGripSize(v: string) {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function normalizeAndValidateGripSize(v: string): GripSizeValue | '' {
  const normalized = normalizeGripSize(v);
  if (GRIP_SIZE_SET.has(normalized as GripSizeValue)) return normalized as GripSizeValue;

  const loose = normalized.toLowerCase().replace(/\s+/g, ' ');
  for (const [value, aliases] of Object.entries(GRIP_SIZE_ALIASES) as [GripSizeValue, readonly string[]][]) {
    if (aliases.includes(loose)) return value;
  }
  return '';
}

export function gripSizeLabel(v?: string) {
  // 표시할 때도 정규화/별칭 매핑을 적용해서
  // g2, G2, 2그립 4 1/4 같은 값을 모두 같은 라벨로 통일한다.
  const normalized = normalizeAndValidateGripSize(String(v ?? ''));
  if (normalized) {
    return GRIP_SIZE_OPTIONS.find((option) => option.value === normalized)?.label ?? normalized;
  }
  return v ?? '';
}
