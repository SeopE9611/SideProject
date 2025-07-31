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
      <div className="text-sm font-medium">결제 방식</div>
      <div className="flex flex-col gap-1">
        {bankInfo && (
          <div className="mt-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800 leading-relaxed border border-gray-200 space-y-1">
            <div className="font-semibold">{method}</div>
            <div className="font-medium">{bankInfo.label}</div>
            <div className="font-mono tracking-wide">{bankInfo.account}</div>
            <div className="text-sm">예금주: {bankInfo.holder}</div>
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
