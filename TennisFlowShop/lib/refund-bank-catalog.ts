export type RefundBankCatalogItem = {
  /**
   * 환불 계좌 저장용 canonical code
   * - DB에는 이 code를 저장한다.
   * - 향후 PG 코드 매핑 시 sourceCode 필드 등을 추가하기 쉽게 분리.
   */
  code: string;
  /** 화면 표시용 은행명 */
  label: string;
  /** 검색 alias (초성/약칭/영문명 포함 가능) */
  keywords: string[];
};

export const REFUND_BANK_CATALOG: readonly RefundBankCatalogItem[] = [
  { code: 'kb', label: '국민은행', keywords: ['국민', 'KB', 'KB국민', 'kookmin'] },
  { code: 'shinhan', label: '신한은행', keywords: ['신한', 'shinhan'] },
  { code: 'woori', label: '우리은행', keywords: ['우리', 'woori'] },
  { code: 'hana', label: '하나은행', keywords: ['하나', 'KEB하나', 'keb', 'hana'] },
  { code: 'ibk', label: '기업은행', keywords: ['기업', 'IBK', 'ibk'] },
  { code: 'nh', label: '농협은행', keywords: ['농협', 'NH', 'nonghyup'] },
  { code: 'sc', label: 'SC제일은행', keywords: ['SC', '제일', 'sc제일', 'standard chartered'] },
  { code: 'citi', label: '한국씨티은행', keywords: ['씨티', '시티', 'citi'] },
  { code: 'kbank', label: '케이뱅크', keywords: ['케이뱅크', 'kbank', 'k bank'] },
  { code: 'kakao', label: '카카오뱅크', keywords: ['카카오뱅크', '카뱅', 'kakao'] },
  { code: 'toss', label: '토스뱅크', keywords: ['토스뱅크', 'toss'] },
  { code: 'suhyup', label: '수협은행', keywords: ['수협', 'sh수협', 'suhyup'] },
  { code: 'post', label: '우체국', keywords: ['우체국', 'post', 'epost'] },
  { code: 'mg', label: '새마을금고', keywords: ['새마을금고', 'mg'] },
  { code: 'cu', label: '신협', keywords: ['신협', 'credit union', 'cu'] },
  { code: 'savings', label: '저축은행', keywords: ['저축은행', 'savings', 'sb'] },
] as const;

const BANK_CODE_SET = new Set(REFUND_BANK_CATALOG.map((bank) => bank.code));
const BANK_LABEL_MAP = new Map(REFUND_BANK_CATALOG.map((bank) => [bank.code, bank.label]));

export const REFUND_BANK_CODES = REFUND_BANK_CATALOG.map((bank) => bank.code);

export const isRefundBankCode = (value: string) => BANK_CODE_SET.has(value);

export const getRefundBankCatalogItem = (code?: string | null) => {
  if (!code) return null;
  return REFUND_BANK_CATALOG.find((bank) => bank.code === code) ?? null;
};

export const getRefundBankCatalogLabel = (code?: string | null) => {
  if (!code) return null;
  return BANK_LABEL_MAP.get(code) ?? null;
};
