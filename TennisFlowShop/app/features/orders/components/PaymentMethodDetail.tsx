import { bankLabelMap } from '@/lib/constants';

interface PaymentMethodDetailProps {
  method: string;
  bankKey?: string;
  depositor?: string;
}

export default function PaymentMethodDetail({ method, bankKey, depositor }: PaymentMethodDetailProps) {
  const bankInfo = bankKey ? bankLabelMap[bankKey] : null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">결제 방식</div>
      <div className="flex flex-col gap-1">
        {bankInfo && (
          <div className="mt-1 rounded-md border border-border bg-muted/60 dark:bg-card px-3 py-2 text-sm text-foreground/90 leading-relaxed space-y-1">
            <div className="font-semibold text-foreground">{method}</div>
            <div className="font-medium text-foreground">{bankInfo.label}</div>
            <div className="font-mono tracking-wide text-foreground">{bankInfo.account}</div>
            <div className="text-sm text-muted-foreground">예금주: {bankInfo.holder}</div>
          </div>
        )}
        {!bankInfo && bankKey && <div className="text-sm">{bankKey}</div>}
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
