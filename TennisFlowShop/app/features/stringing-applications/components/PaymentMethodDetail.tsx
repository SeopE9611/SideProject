import { bankLabelMap } from "@/lib/constants";

interface PaymentMethodDetailProps {
  method?: string | null;
  bankKey?: string;
  depositor?: string;
  isPackageApplied?: boolean;
  paymentProvider?: string | null;
  easyPayProvider?: string | null;
  paymentStatus?: string | null;
  paymentTid?: string | null;
  paymentCardDisplayName?: string | null;
  paymentCardCompany?: string | null;
  paymentCardLabel?: string | null;
  paymentNiceSync?: {
    lastSyncedAt?: string | null;
    pgStatus?: string | null;
    source?: string | null;
  } | null;
}

const EASY_PAY_PROVIDER_LABEL_MAP: Record<string, string> = {
  TOSSPAY: "토스페이",
  KAKAOPAY: "카카오페이",
  NAVERPAY: "네이버페이",
  PAYCO: "페이코",
  SAMSUNGPAY: "삼성페이",
  LGPAY: "LG페이",
};

function getTossMethodLabel(method?: string | null, easyPayProvider?: string | null) {
  const normalized = String(method ?? "").trim().toUpperCase();
  const hasEasyPayProvider = Boolean(String(easyPayProvider ?? "").trim());

  if (normalized.includes("CARD") && (normalized.includes("EASY") || hasEasyPayProvider)) {
    return "카드/간편결제";
  }
  if (normalized.includes("EASY") || hasEasyPayProvider) {
    return "간편결제";
  }
  if (normalized.includes("CARD")) {
    return "카드 결제";
  }
  return "카드/간편결제";
}

function getNiceMethodLabel(method?: string | null, easyPayProvider?: string | null) {
  const normalized = String(method ?? "").trim().toUpperCase();
  const hasEasyPayProvider = Boolean(String(easyPayProvider ?? "").trim());

  if (normalized.includes("CARD") && (normalized.includes("EASY") || hasEasyPayProvider)) {
    return "카드/간편결제";
  }
  if (normalized.includes("EASY") || hasEasyPayProvider) {
    return "간편결제";
  }
  if (normalized.includes("VBANK")) {
    return "가상계좌";
  }
  if (normalized.includes("BANK")) {
    return "계좌이체";
  }
  if (normalized.includes("CELLPHONE") || normalized.includes("MOBILE") || normalized.includes("PHONE")) {
    return "휴대폰 결제";
  }
  if (normalized.includes("CARD")) {
    return "카드 결제";
  }
  return "NicePay 결제";
}

function getEasyPayProviderLabel(easyPayProvider?: string | null) {
  const normalized = String(easyPayProvider ?? "").trim().toUpperCase();
  if (!normalized) return null;
  return EASY_PAY_PROVIDER_LABEL_MAP[normalized] ?? normalized;
}

function getCardDisplayName(params: {
  paymentCardDisplayName?: string | null;
  paymentCardLabel?: string | null;
  paymentCardCompany?: string | null;
}) {
  return (
    String(params.paymentCardDisplayName ?? "").trim() ||
    String(params.paymentCardLabel ?? "").trim() ||
    String(params.paymentCardCompany ?? "").trim() ||
    ""
  );
}

export default function PaymentMethodDetail({
  method,
  bankKey,
  depositor,
  isPackageApplied = false,
  paymentProvider,
  easyPayProvider,
  paymentStatus,
  paymentTid,
  paymentCardDisplayName,
  paymentCardCompany,
  paymentCardLabel,
  paymentNiceSync,
}: PaymentMethodDetailProps) {
  const bankInfo = bankKey ? bankLabelMap[bankKey] : null;
  const isTossPayment = String(paymentProvider ?? "").trim().toLowerCase() === "tosspayments";
  const isNicePayment = String(paymentProvider ?? "").trim().toLowerCase() === "nicepay";
  const isPackagePayment = isPackageApplied;
  const tossMethodLabel = getTossMethodLabel(method, easyPayProvider);
  const niceMethodLabel = getNiceMethodLabel(method, easyPayProvider);
  const easyPayProviderLabel = getEasyPayProviderLabel(easyPayProvider);
  const cardDisplayName = getCardDisplayName({
    paymentCardDisplayName,
    paymentCardLabel,
    paymentCardCompany,
  });
  const resolvedMethodLabel = isPackagePayment
    ? "패키지 사용"
    : String(method ?? "").trim();

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">결제 방식</div>
      <div className="flex flex-col gap-1">
        {isPackagePayment ? (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">패키지 사용</div>
            {paymentStatus && <div className="text-sm text-muted-foreground">결제 상태: {paymentStatus}</div>}
          </div>
        ) : isTossPayment ? (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{tossMethodLabel}</div>
            <div className="text-sm text-muted-foreground">결제 제공사: Toss Payments</div>
            {easyPayProviderLabel && <div className="text-sm text-muted-foreground">간편결제: {easyPayProviderLabel}</div>}
            {paymentStatus && <div className="text-sm text-muted-foreground">결제 상태: {paymentStatus}</div>}
          </div>
        ) : isNicePayment ? (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{niceMethodLabel}</div>
            {cardDisplayName && <div className="text-sm text-muted-foreground">카드사: {cardDisplayName}</div>}
            <div className="text-sm text-muted-foreground">결제 제공사: NicePay</div>
            {paymentStatus && <div className="text-sm text-muted-foreground">결제 상태: {paymentStatus}</div>}
            {paymentTid && <div className="text-sm text-muted-foreground">거래 TID: {paymentTid}</div>}
            {paymentNiceSync?.pgStatus && <div className="text-sm text-muted-foreground">PG 상태: {paymentNiceSync.pgStatus}</div>}
            {paymentNiceSync?.lastSyncedAt && (
              <div className="text-sm text-muted-foreground">최근 동기화: {new Date(paymentNiceSync.lastSyncedAt).toLocaleString("ko-KR")}</div>
            )}
          </div>
        ) : null}
        {bankInfo && (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{resolvedMethodLabel || "무통장입금"}</div>
            <div className="font-medium text-foreground">{bankInfo.label}</div>
            <div className="font-mono tracking-wide text-foreground">
              {bankInfo.account}
            </div>
            <div className="text-sm text-muted-foreground">
              예금주: {bankInfo.holder}
            </div>
          </div>
        )}
        {!isPackagePayment && !isTossPayment && !isNicePayment && !bankInfo && (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 leading-relaxed">
            {resolvedMethodLabel || "결제 정보 확인 필요"}
          </div>
        )}
        {!isPackagePayment && !isTossPayment && !isNicePayment && !bankInfo && bankKey && <div className="text-sm">{bankKey}</div>}
        {!isPackagePayment && !isTossPayment && !isNicePayment && depositor && (
          <div>
            <div className="text-sm font-medium">입금자명</div>
            <div>{depositor}</div>
          </div>
        )}
      </div>
    </div>
  );
}
