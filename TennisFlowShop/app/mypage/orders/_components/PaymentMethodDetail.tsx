import { bankLabelMap } from "@/lib/constants";
import { getPaymentDisplaySummary } from "@/lib/payments/payment-display";

interface PaymentMethodDetailProps {
  method: string;
  bankKey?: string;
  depositor?: string;
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

export default function PaymentMethodDetail({
  method,
  bankKey,
  depositor,
  paymentProvider,
  easyPayProvider,
  paymentStatus,
  paymentCardDisplayName,
  paymentCardCompany,
  paymentCardLabel,
}: PaymentMethodDetailProps) {
  const isTossPayment =
    String(paymentProvider ?? "")
      .trim()
      .toLowerCase() === "tosspayments";
  const isNicePayment =
    String(paymentProvider ?? "")
      .trim()
      .toLowerCase() === "nicepay";
  const bankInfo = bankKey ? bankLabelMap[bankKey] : null;
  const paymentSummary = getPaymentDisplaySummary({
    method,
    provider: paymentProvider,
    easyPayProvider,
    cardDisplayName: paymentCardDisplayName,
    cardCompany: paymentCardCompany,
    cardLabel: paymentCardLabel,
    bank: bankKey,
    depositor,
  });
  const statusLabel = paymentStatus === "결제완료" ? "결제완료" : paymentStatus;

  return (
    <div className="space-y-2">
      <div className="text-ui-body-sm font-medium">결제 방식</div>
      <div className="flex flex-col gap-1">
        {isTossPayment ? (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-ui-body-sm text-foreground leading-relaxed border border-border space-y-1">
            <div className="font-semibold">{paymentSummary.userLabel}</div>
            {paymentSummary.easyPayProviderLabel && (
              <div className="text-ui-body-sm">간편결제: {paymentSummary.easyPayProviderLabel}</div>
            )}
            {statusLabel && <div className="text-ui-body-sm">결제 상태: {statusLabel}</div>}
          </div>
        ) : isNicePayment ? (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-ui-body-sm text-foreground leading-relaxed border border-border space-y-1">
            <div className="font-semibold">{paymentSummary.userLabel}</div>
            {paymentSummary.cardDisplayName && (
              <div className="text-ui-body-sm">카드사: {paymentSummary.cardDisplayName}</div>
            )}
            {statusLabel && <div className="text-ui-body-sm">결제 상태: {statusLabel}</div>}
          </div>
        ) : bankInfo ? (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-ui-body-sm text-foreground leading-relaxed border border-border space-y-1">
            <div className="font-semibold">무통장입금</div>
            <div className="font-medium">{bankInfo.label}</div>
            <div className="font-mono tracking-wide">{bankInfo.account}</div>
            <div className="text-ui-body-sm">예금주: {bankInfo.holder}</div>
          </div>
        ) : (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-ui-body-sm text-foreground leading-relaxed border border-border">
            {paymentSummary.userLabel}
          </div>
        )}
        {!isTossPayment && !isNicePayment && !bankInfo && bankKey && (
          <div className="text-ui-body-sm">{bankKey}</div>
        )}
        {!isTossPayment && !isNicePayment && depositor && (
          <div>
            <div className="text-ui-body-sm font-medium">입금자명</div>
            <div>{depositor}</div>
          </div>
        )}
      </div>
    </div>
  );
}
