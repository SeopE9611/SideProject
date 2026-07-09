export type PaymentDisplayInput = {
  method?: unknown;
  provider?: unknown;
  easyPayProvider?: unknown;
  cardDisplayName?: unknown;
  cardLabel?: unknown;
  cardCompany?: unknown;
  niceCard?: unknown;
  rawSummary?: unknown;
  bank?: unknown;
  depositor?: unknown;
  isPackageApplied?: boolean;
};

export type PaymentDisplaySummary = {
  primaryLabel: string;
  providerLabel: string | null;
  cardDisplayName: string | null;
  easyPayProviderLabel: string | null;
  userLabel: string;
  adminLabel: string;
};

const EMPTY_TEXTS = new Set(["", "null", "undefined", "nan"]);

const EASY_PAY_PROVIDER_LABEL_MAP: Record<string, string> = {
  TOSSPAY: "토스페이",
  TOSS: "토스페이",
  KAKAOPAY: "카카오페이",
  KAKAO: "카카오페이",
  NAVERPAY: "네이버페이",
  NAVER: "네이버페이",
  PAYCO: "페이코",
  SAMSUNGPAY: "삼성페이",
  LGPAY: "LG페이",
};

const PROVIDER_LABEL_MAP: Record<string, string> = {
  nicepay: "NICEPAY",
  tosspayments: "Toss Payments",
  toss: "Toss Payments",
  manual_bank_transfer: "무통장입금",
  bank_transfer: "무통장입금",
};

function cleanText(value?: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return EMPTY_TEXTS.has(text.toLowerCase()) ? null : text;
}

function asRecord(value?: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return null;
}

function normalize(value?: unknown) {
  return cleanText(value)?.toLowerCase() ?? "";
}

export function getPaymentProviderLabel(provider?: unknown): string | null {
  const text = cleanText(provider);
  if (!text) return null;
  return PROVIDER_LABEL_MAP[text.toLowerCase()] ?? text;
}

export function getEasyPayProviderLabel(provider?: unknown): string | null {
  const text = cleanText(provider);
  if (!text) return null;
  return EASY_PAY_PROVIDER_LABEL_MAP[text.toUpperCase()] ?? text;
}

export function getPaymentCardDisplayName(paymentInfoLike?: unknown): string | null {
  const info = asRecord(paymentInfoLike);
  if (!info) return null;
  const niceCard = asRecord(info.niceCard);
  const rawSummary = asRecord(info.rawSummary);
  const rawCard = asRecord(rawSummary?.card);

  return firstText(
    info.cardDisplayName,
    info.cardLabel,
    info.cardCompany,
    niceCard?.displayName,
    niceCard?.cardName,
    niceCard?.issuerName,
    niceCard?.acquirerName,
    rawCard?.displayName,
    rawCard?.cardName,
    rawCard?.issuerName,
    rawCard?.acquirerName,
    rawSummary?.cardDisplayName,
    rawSummary?.cardLabel,
    rawSummary?.cardCompany,
    rawSummary?.cardName,
    rawSummary?.issuerName,
    rawSummary?.acquirerName,
  );
}

function getMethodBaseLabel(method?: unknown, easyPayProvider?: unknown): string {
  const normalized = cleanText(method)?.toUpperCase() ?? "";
  const lowered = cleanText(method)?.toLowerCase() ?? "";
  const hasEasyPay = Boolean(cleanText(easyPayProvider));

  if (["bank_transfer", "manual_bank_transfer", "bank", "virtual_account"].includes(lowered)) return "무통장입금";
  if (normalized.includes("VBANK")) return "가상계좌";
  if (normalized.includes("BANK") || normalized.includes("TRANSFER")) return "무통장입금";
  if (
    normalized.includes("CELLPHONE") ||
    normalized.includes("MOBILE") ||
    normalized.includes("PHONE")
  )
    return "휴대폰 결제";
  if (normalized.includes("EASY") || hasEasyPay)
    return normalized.includes("CARD") ? "카드/간편결제" : "간편결제";
  if (normalized.includes("CARD") || normalized === "NICEPAY" || normalized === "TOSSPAYMENTS")
    return "카드결제";
  if (normalized.includes("PACKAGE")) return "패키지 사용";
  if (normalized.includes("무통장") || normalized.includes("BANK_TRANSFER")) return "무통장입금";
  return cleanText(method) ?? "결제 정보 확인 필요";
}

export function getPaymentMethodDisplayLabel(params: PaymentDisplayInput): string {
  return getPaymentDisplaySummary(params).userLabel;
}

export function getPaymentDisplaySummary(params: PaymentDisplayInput): PaymentDisplaySummary {
  if (params.isPackageApplied) {
    return {
      primaryLabel: "패키지 사용",
      providerLabel: null,
      cardDisplayName: null,
      easyPayProviderLabel: null,
      userLabel: "패키지 사용",
      adminLabel: "패키지 사용",
    };
  }

  const provider = normalize(params.provider);
  const providerLabel = getPaymentProviderLabel(params.provider);
  const easyPayProviderLabel = getEasyPayProviderLabel(params.easyPayProvider);
  const cardDisplayName = getPaymentCardDisplayName(params);
  const hasBankInfo = Boolean(cleanText(params.bank) || cleanText(params.depositor));
  const isProviderOnly = ["nicepay", "tosspayments", "toss"].includes(provider);
  const primaryLabel =
    hasBankInfo && !isProviderOnly
      ? "무통장입금"
      : getMethodBaseLabel(params.method, params.easyPayProvider);
  const safePrimaryLabel =
    isProviderOnly && primaryLabel === "결제 정보 확인 필요" ? "카드/간편결제" : primaryLabel;
  const userLabel = [safePrimaryLabel, cardDisplayName || easyPayProviderLabel]
    .filter(Boolean)
    .join(" · ");
  const adminBase =
    providerLabel && isProviderOnly
      ? `${safePrimaryLabel.replace("카드결제", "카드")} / ${providerLabel}`
      : safePrimaryLabel;
  const adminDetail =
    cardDisplayName ||
    easyPayProviderLabel ||
    (provider === "nicepay" ? "카드정보 확인 필요" : null);

  return {
    primaryLabel: safePrimaryLabel,
    providerLabel,
    cardDisplayName,
    easyPayProviderLabel,
    userLabel: userLabel || "결제 정보 확인 필요",
    adminLabel: [adminBase, adminDetail].filter(Boolean).join(" · ") || "결제 정보 확인 필요",
  };
}
