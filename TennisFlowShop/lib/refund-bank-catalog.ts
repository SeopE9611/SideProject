export type RefundBankPgMappings = {
  tossPayments?: string;
  inicis?: string;
  kcp?: string;
  nicepay?: string;
};

export type RefundBankCatalogCategory =
  | "major"
  | "internet"
  | "regional"
  | "mutual"
  | "postal"
  | "policy";

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
  /** 은행 그룹 분류 (표시/필터/정렬/운영 정책 분기용) */
  category?: RefundBankCatalogCategory;
  /**
   * PG사별 은행 코드 매핑 확장 포인트
   * - 현재는 값 미입력(추측 하드코딩 금지)
   * - 실제 연동 시 이 필드만 채워 확장 가능
   */
  pgMappings?: RefundBankPgMappings;
};

export const REFUND_BANK_CATALOG: readonly RefundBankCatalogItem[] = [
  {
    code: "kb",
    label: "국민은행",
    keywords: ["국민", "KB", "KB국민", "kookmin"],
    category: "major",
  },
  {
    code: "shinhan",
    label: "신한은행",
    keywords: ["신한", "shinhan"],
    category: "major",
  },
  {
    code: "woori",
    label: "우리은행",
    keywords: ["우리", "woori"],
    category: "major",
  },
  {
    code: "hana",
    label: "하나은행",
    keywords: ["하나", "KEB하나", "keb", "hana"],
    category: "major",
  },
  {
    code: "ibk",
    label: "기업은행",
    keywords: ["기업", "IBK", "ibk"],
    category: "major",
  },
  {
    code: "nh",
    label: "농협은행",
    keywords: ["농협", "NH", "nonghyup"],
    category: "major",
  },
  {
    code: "sc",
    label: "SC제일은행",
    keywords: ["SC", "제일", "sc제일", "standard chartered"],
    category: "major",
  },
  {
    code: "citi",
    label: "한국씨티은행",
    keywords: ["씨티", "시티", "citi"],
    category: "major",
  },

  {
    code: "kakao",
    label: "카카오뱅크",
    keywords: ["카카오뱅크", "카뱅", "kakao"],
    category: "internet",
  },
  {
    code: "kbank",
    label: "케이뱅크",
    keywords: ["케이뱅크", "kbank", "k bank"],
    category: "internet",
  },
  {
    code: "toss",
    label: "토스뱅크",
    keywords: ["토스뱅크", "toss"],
    category: "internet",
  },

  {
    code: "busan",
    label: "부산은행",
    keywords: ["부산", "bnk부산", "busan"],
    category: "regional",
  },
  {
    code: "kn",
    label: "경남은행",
    keywords: ["경남", "bnk경남", "knbank"],
    category: "regional",
  },
  {
    code: "gwangju",
    label: "광주은행",
    keywords: ["광주", "광주은행", "kjb"],
    category: "regional",
  },
  {
    code: "jeonbuk",
    label: "전북은행",
    keywords: ["전북", "전북은행", "jb"],
    category: "regional",
  },
  {
    code: "jeju",
    label: "제주은행",
    keywords: ["제주", "제주은행", "jejubank"],
    category: "regional",
  },
  {
    code: "im",
    label: "iM뱅크(구 대구은행)",
    keywords: ["iM", "iM뱅크", "대구은행", "dgb"],
    category: "regional",
  },

  {
    code: "suhyup",
    label: "수협은행",
    keywords: ["수협", "sh수협", "suhyup"],
    category: "mutual",
  },
  {
    code: "mg",
    label: "새마을금고",
    keywords: ["새마을금고", "mg"],
    category: "mutual",
  },
  {
    code: "cu",
    label: "신협",
    keywords: ["신협", "credit union", "cu"],
    category: "mutual",
  },
  {
    code: "savings",
    label: "저축은행",
    keywords: ["저축은행", "savings", "sb"],
    category: "mutual",
  },
  {
    code: "sj",
    label: "산림조합",
    keywords: ["산림조합", "sj", "산림"],
    category: "mutual",
  },

  {
    code: "post",
    label: "우체국",
    keywords: ["우체국", "post", "epost"],
    category: "postal",
  },

  {
    code: "kdb",
    label: "산업은행",
    keywords: ["산업은행", "kdb"],
    category: "policy",
  },
] as const;

const BANK_CODE_SET = new Set(REFUND_BANK_CATALOG.map((bank) => bank.code));
const BANK_LABEL_MAP = new Map(
  REFUND_BANK_CATALOG.map((bank) => [bank.code, bank.label]),
);

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
