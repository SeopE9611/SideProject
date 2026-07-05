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
  paymentTid,
  paymentCardDisplayName,
  paymentCardCompany,
  paymentCardLabel,
  paymentNiceSync,
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
      <div className="text-ui-body-sm font-medium text-foreground">결제 방식</div>
      <div className="flex flex-col gap-1">
        {isTossPayment ? (
          <div className="mt-1 rounded-md border border-border bg-muted/20 dark:bg-card px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-medium text-foreground">{paymentSummary.userLabel}</div>
            <div className="text-ui-body-sm text-muted-foreground">
              결제 제공사: {paymentSummary.providerLabel}
            </div>
            {paymentSummary.easyPayProviderLabel && (
              <div className="text-ui-body-sm text-muted-foreground">
                간편결제: {paymentSummary.easyPayProviderLabel}
              </div>
            )}
            {statusLabel && (
              <div className="text-ui-body-sm text-muted-foreground">결제 상태: {statusLabel}</div>
            )}
          </div>
        ) : isNicePayment ? (
          <div className="mt-1 rounded-md border border-border bg-muted/20 dark:bg-card px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-medium text-foreground">{paymentSummary.userLabel}</div>
            {paymentSummary.cardDisplayName && (
              <div className="text-ui-body-sm text-muted-foreground">
                카드사: {paymentSummary.cardDisplayName}
              </div>
            )}
            {statusLabel && (
              <div className="text-ui-body-sm text-muted-foreground">결제 상태: {statusLabel}</div>
            )}
            {paymentTid && (
              <div className="text-ui-body-sm text-muted-foreground">거래 TID: {paymentTid}</div>
            )}
            {paymentNiceSync?.pgStatus && (
              <div className="text-ui-body-sm text-muted-foreground">
                PG 상태: {paymentNiceSync.pgStatus}
              </div>
            )}
            {paymentNiceSync?.lastSyncedAt && (
              <div className="text-ui-body-sm text-muted-foreground">
                최근 동기화: {new Date(paymentNiceSync.lastSyncedAt).toLocaleString("ko-KR")}
              </div>
            )}
          </div>
        ) : bankInfo ? (
          <div className="mt-1 rounded-md border border-border bg-muted/20 dark:bg-card px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-medium text-foreground">무통장입금</div>
            <div className="font-medium text-foreground">{bankInfo.label}</div>
            <div className="font-mono tracking-wide text-foreground">{bankInfo.account}</div>
            <div className="text-ui-body-sm text-muted-foreground">예금주: {bankInfo.holder}</div>
          </div>
        ) : (
          <div className="mt-1 rounded-md border border-border bg-muted/20 dark:bg-card px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed">
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
