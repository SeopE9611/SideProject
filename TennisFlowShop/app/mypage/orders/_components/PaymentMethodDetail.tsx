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
  const bankInfo = bankKey ? bankLabelMap[bankKey] : null;
  const tossMethodLabel = getTossMethodLabel(method, easyPayProvider);
  const easyPayProviderLabel = getEasyPayProviderLabel(easyPayProvider);
  const statusLabel = paymentStatus === "결제완료" ? "결제완료" : paymentStatus;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">결제 방식</div>
      <div className="flex flex-col gap-1">
        {isTossPayment ? (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-sm text-foreground leading-relaxed border border-border space-y-1">
            <div className="font-semibold">{tossMethodLabel}</div>
            <div className="text-sm">결제 제공사: Toss Payments</div>
            {easyPayProviderLabel && <div className="text-sm">간편결제: {easyPayProviderLabel}</div>}
            {statusLabel && <div className="text-sm">결제 상태: {statusLabel}</div>}
          </div>
        ) : bankInfo ? (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-sm text-foreground leading-relaxed border border-border space-y-1">
            <div className="font-semibold">{method || "무통장입금"}</div>
            <div className="font-medium">{bankInfo.label}</div>
            <div className="font-mono tracking-wide">{bankInfo.account}</div>
            <div className="text-sm">예금주: {bankInfo.holder}</div>
          </div>
        ) : (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-sm text-foreground leading-relaxed border border-border">
            {method || "결제 정보 확인 필요"}
          </div>
        )}
        {!isTossPayment && !bankInfo && bankKey && <div className="text-sm">{bankKey}</div>}
        {!isTossPayment && depositor && (
          <div>
            <div className="text-sm font-medium">입금자명</div>
            <div>{depositor}</div>
          </div>
        )}
      </div>
    </div>
  );
}
