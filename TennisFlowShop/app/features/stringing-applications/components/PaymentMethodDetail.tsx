import { bankLabelMap } from "@/lib/constants";

interface PaymentMethodDetailProps {
  method: string;
  bankKey?: string;
  depositor?: string;
  provider?: string | null;
  easyPayProvider?: string | null;
  tid?: string | null;
  cardDisplayName?: string | null;
  cardCompany?: string | null;
  cardLabel?: string | null;
  approvedAt?: string | null;
}

export default function PaymentMethodDetail({
  method,
  bankKey,
  depositor,
  provider,
  easyPayProvider,
  tid,
  cardDisplayName,
  cardCompany,
  cardLabel,
  approvedAt,
}: PaymentMethodDetailProps) {
  const bankInfo = bankKey ? bankLabelMap[bankKey] : null;
  const normalizedProvider = String(provider ?? "").trim();
  const normalizedEasyPay = String(easyPayProvider ?? "").trim();
  const normalizedTid = String(tid ?? "").trim();
  const cardName =
    String(cardDisplayName ?? "").trim() ||
    String(cardLabel ?? "").trim() ||
    String(cardCompany ?? "").trim();

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">결제 방식</div>
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground">{method}</div>
        {(normalizedProvider || normalizedEasyPay || normalizedTid || cardName || approvedAt) && (
          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            {normalizedProvider && <div>PG사: {normalizedProvider}</div>}
            {normalizedEasyPay && <div>간편결제: {normalizedEasyPay}</div>}
            {cardName && <div>카드: {cardName}</div>}
            {normalizedTid && <div className="font-mono tracking-wide">TID: {normalizedTid}</div>}
            {approvedAt && <div>승인시각: {new Date(approvedAt).toLocaleString("ko-KR")}</div>}
          </div>
        )}
        {bankInfo && (
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-medium text-foreground">{bankInfo.label}</div>
            <div className="font-mono tracking-wide text-foreground">
              {bankInfo.account}
            </div>
            <div className="text-sm text-muted-foreground">
              예금주: {bankInfo.holder}
            </div>
          </div>
        )}
        {!bankInfo && bankKey && (
          <div className="text-sm text-muted-foreground">{bankKey}</div>
        )}
        {depositor && (
          <div>
            <div className="text-sm font-medium">입금자명</div>
            <div>{depositor}</div>
          </div>
        )}
      </div>
    </div>
  );
}
