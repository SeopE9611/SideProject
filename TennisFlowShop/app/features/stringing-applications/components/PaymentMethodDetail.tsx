import { bankLabelMap } from "@/lib/constants";
import { getPaymentDisplaySummary } from "@/lib/payments/payment-display";

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
  approvedAt?: string | null;
  paymentNiceSync?: {
    lastSyncedAt?: string | null;
    pgStatus?: string | null;
    source?: string | null;
    resultCode?: string | null;
    resultMsg?: string | null;
    canceledAt?: string | null;
    cancelAmount?: number | null;
  } | null;
  niceOrderId?: string | null;
  showAdminPgDetails?: boolean;
}

function formatApprovedAt(approvedAt?: string | null) {
  const raw = String(approvedAt ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString("ko-KR");
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
  approvedAt,
  paymentNiceSync,
  niceOrderId,
  showAdminPgDetails = false,
}: PaymentMethodDetailProps) {
  const bankInfo = bankKey ? bankLabelMap[bankKey] : null;
  const isTossPayment =
    String(paymentProvider ?? "")
      .trim()
      .toLowerCase() === "tosspayments";
  const isNicePayment =
    String(paymentProvider ?? "")
      .trim()
      .toLowerCase() === "nicepay";
  const isPackagePayment = isPackageApplied;
  const paymentSummary = getPaymentDisplaySummary({
    method,
    provider: paymentProvider,
    easyPayProvider,
    cardDisplayName: paymentCardDisplayName,
    cardCompany: paymentCardCompany,
    cardLabel: paymentCardLabel,
    bank: bankKey,
    depositor,
    isPackageApplied,
  });
  const approvedAtLabel = formatApprovedAt(approvedAt);
  const canceledAtLabel = formatApprovedAt(paymentNiceSync?.canceledAt);
  const lastSyncedAtLabel = formatApprovedAt(paymentNiceSync?.lastSyncedAt);
  const shouldShowBankBox = !isPackagePayment && !isTossPayment && !isNicePayment && !!bankInfo;

  return (
    <div className="space-y-2">
      <div className="text-ui-body-sm font-medium text-foreground">결제 방식</div>
      <div className="flex flex-col gap-1">
        {isPackagePayment ? (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">패키지 사용</div>
            {paymentStatus && (
              <div className="text-ui-body-sm text-muted-foreground">
                결제 상태: {paymentStatus}
              </div>
            )}
          </div>
        ) : isTossPayment ? (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{paymentSummary.userLabel}</div>
            {paymentSummary.easyPayProviderLabel && (
              <div className="text-ui-body-sm text-muted-foreground">
                간편결제: {paymentSummary.easyPayProviderLabel}
              </div>
            )}
            {paymentStatus && (
              <div className="text-ui-body-sm text-muted-foreground">
                결제 상태: {paymentStatus}
              </div>
            )}
            {approvedAtLabel && (
              <div className="text-ui-body-sm text-muted-foreground">
                승인 시각: {approvedAtLabel}
              </div>
            )}
          </div>
        ) : isNicePayment ? (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{paymentSummary.userLabel}</div>
            {paymentSummary.cardDisplayName && (
              <div className="text-ui-body-sm text-muted-foreground">
                카드사: {paymentSummary.cardDisplayName}
              </div>
            )}
            {showAdminPgDetails && paymentSummary.providerLabel && (
              <div className="text-ui-body-sm text-muted-foreground">
                결제 제공사: {paymentSummary.providerLabel}
              </div>
            )}
            {paymentStatus && (
              <div className="text-ui-body-sm text-muted-foreground">
                결제 상태: {paymentStatus}
              </div>
            )}
            {showAdminPgDetails && paymentTid && (
              <div className="text-ui-body-sm text-muted-foreground">거래 TID: {paymentTid}</div>
            )}
            {showAdminPgDetails && niceOrderId && (
              <div className="text-ui-body-sm text-muted-foreground">
                NICE 주문번호: {niceOrderId}
              </div>
            )}
            {approvedAtLabel && (
              <div className="text-ui-body-sm text-muted-foreground">
                승인 시각: {approvedAtLabel}
              </div>
            )}
            {showAdminPgDetails && paymentNiceSync?.pgStatus && (
              <div className="text-ui-body-sm text-muted-foreground">
                PG 상태: {paymentNiceSync.pgStatus}
              </div>
            )}
            {showAdminPgDetails && (paymentNiceSync?.resultCode || paymentNiceSync?.resultMsg) && (
              <div className="text-ui-body-sm text-muted-foreground">
                PG 결과:{" "}
                {[paymentNiceSync.resultCode, paymentNiceSync.resultMsg]
                  .filter(Boolean)
                  .join(" / ")}
              </div>
            )}
            {showAdminPgDetails && canceledAtLabel && (
              <div className="text-ui-body-sm text-muted-foreground">
                PG 취소일시: {canceledAtLabel}
              </div>
            )}
            {showAdminPgDetails && lastSyncedAtLabel && (
              <div className="text-ui-body-sm text-muted-foreground">
                마지막 동기화: {lastSyncedAtLabel}
              </div>
            )}
          </div>
        ) : null}
        {shouldShowBankBox && (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">무통장입금</div>
            <div className="font-medium text-foreground">{bankInfo.label}</div>
            <div className="font-mono tracking-wide text-foreground">{bankInfo.account}</div>
            <div className="text-ui-body-sm text-muted-foreground">예금주: {bankInfo.holder}</div>
          </div>
        )}
        {!isPackagePayment && !isTossPayment && !isNicePayment && !bankInfo && (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-ui-body-sm text-foreground/90 leading-relaxed">
            {paymentSummary.userLabel}
          </div>
        )}
        {!isPackagePayment && !isTossPayment && !isNicePayment && !bankInfo && bankKey && (
          <div className="text-ui-body-sm">{bankKey}</div>
        )}
        {!isPackagePayment && !isTossPayment && !isNicePayment && depositor && (
          <div>
            <div className="text-ui-body-sm font-medium">입금자명</div>
            <div>{depositor}</div>
          </div>
        )}
      </div>
    </div>
  );
}
