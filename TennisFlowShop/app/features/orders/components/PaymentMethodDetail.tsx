import { bankLabelMap } from "@/lib/constants";

interface PaymentMethodDetailProps {
  method: string;
  bankKey?: string;
  depositor?: string;
  paymentProvider?: string | null;
  easyPayProvider?: string | null;
  paymentStatus?: string | null;
}

const EASY_PAY_PROVIDER_LABEL_MAP: Record<string, string> = {
  TOSSPAY: "토스페이",
  KAKAOPAY: "카카오페이",
  NAVERPAY: "네이버페이",
  PAYCO: "페이코",
  SAMSUNGPAY: "삼성페이",
  LGPAY: "LG페이",
};

function getTossMethodLabel(method?: string, easyPayProvider?: string | null) {
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

function getEasyPayProviderLabel(easyPayProvider?: string | null) {
  const normalized = String(easyPayProvider ?? "").trim().toUpperCase();
  if (!normalized) return null;
  return EASY_PAY_PROVIDER_LABEL_MAP[normalized] ?? normalized;
}

export default function PaymentMethodDetail({
  method,
  bankKey,
  depositor,
  paymentProvider,
  easyPayProvider,
  paymentStatus,
}: PaymentMethodDetailProps) {
  const isTossPayment = String(paymentProvider ?? "").trim().toLowerCase() === "tosspayments";
  const isNicePayment = String(paymentProvider ?? "").trim().toLowerCase() === "nicepay";
  const bankInfo = bankKey ? bankLabelMap[bankKey] : null;
  const tossMethodLabel = getTossMethodLabel(method, easyPayProvider);
  const easyPayProviderLabel = getEasyPayProviderLabel(easyPayProvider);
  const statusLabel = paymentStatus === "결제완료" ? "결제완료" : paymentStatus;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">결제 방식</div>
      <div className="flex flex-col gap-1">
        {isTossPayment ? (
          <div className="mt-1 rounded-md border border-border bg-muted/60 dark:bg-card px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{tossMethodLabel}</div>
            <div className="text-sm text-muted-foreground">결제 제공사: Toss Payments</div>
            {easyPayProviderLabel && <div className="text-sm text-muted-foreground">간편결제: {easyPayProviderLabel}</div>}
            {statusLabel && <div className="text-sm text-muted-foreground">결제 상태: {statusLabel}</div>}
          </div>
        ) : isNicePayment ? (
          <div className="mt-1 rounded-md border border-border bg-muted/60 dark:bg-card px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{method || "카드 결제"}</div>
            <div className="text-sm text-muted-foreground">결제 제공사: NicePay</div>
            {statusLabel && <div className="text-sm text-muted-foreground">결제 상태: {statusLabel}</div>}
          </div>
        ) : bankInfo ? (
          <div className="mt-1 rounded-md border border-border bg-muted/60 dark:bg-card px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{method || "무통장입금"}</div>
            <div className="font-medium text-foreground">{bankInfo.label}</div>
            <div className="font-mono tracking-wide text-foreground">
              {bankInfo.account}
            </div>
            <div className="text-sm text-muted-foreground">
              예금주: {bankInfo.holder}
            </div>
          </div>
        ) : (
          <div className="mt-1 rounded-md border border-border bg-muted/60 dark:bg-card px-3 py-2 text-sm text-foreground/90 leading-relaxed">
            {method || "결제 정보 확인 필요"}
          </div>
        )}
        {!isTossPayment && !isNicePayment && !bankInfo && bankKey && <div className="text-sm">{bankKey}</div>}
        {!isTossPayment && !isNicePayment && depositor && (
          <div>
            <div className="text-sm font-medium">입금자명</div>
            <div>{depositor}</div>
          </div>
        )}
      </div>
    </div>
  );
}
