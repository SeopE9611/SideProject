'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ReceiptText } from 'lucide-react';

type Props = {
  won: (n: number) => string;
  deposit: number;
  fee: number;
  stringPrice: number;
  stringingFee: number;
  total: number;
  // rentalId?: string | null;
};

/**
 * 대여 기반 신청서(/services/apply?rentalId=...)에서의 3단계 결제 정보
 * - 구매 UX와 동일하게 '결제 정보' 스텝은 유지하되,
 * - 대여 결제에서 이미 결제가 완료되므로 입력 UI 대신 '확인용 요약'만 제공한다.
 */
// export default function Step3PaymentInfoRentalReadonly({ won, deposit, fee, stringPrice, stringingFee, total, rentalId }: Props) {
export default function Step3PaymentInfoRentalReadonly({ won, deposit, fee, stringPrice, stringingFee, total }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 mb-4">
          <CreditCard className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">결제 정보</h2>
        <p className="text-muted-foreground">대여 결제에서 이미 결제가 완료되었습니다</p>
      </div>

      <Card className="border border-slate-200/70 dark:border-slate-700/70">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            대여 결제 요약
          </CardTitle>
          <CardDescription className="text-sm">
            대여 결제에 <span className="font-medium">스트링 상품</span>과 <span className="font-medium">교체 서비스 비용</span>까지 포함되어 있어 추가 결제정보 입력이 필요하지 않습니다.
            {/* {rentalId ? <span className="ml-1 text-xs text-muted-foreground">(rentalId: {rentalId})</span> : null} */}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">보증금</span>
            <span className="font-medium tabular-nums">{won(deposit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">대여료</span>
            <span className="font-medium tabular-nums">{won(fee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">스트링 상품</span>
            <span className="font-medium tabular-nums">{won(stringPrice)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">교체 서비스</span>
            <span className="font-medium tabular-nums">{won(stringingFee)}</span>
          </div>
          <div className="pt-2 border-t flex items-center justify-between">
            <span className="font-semibold">합계</span>
            <span className="font-semibold tabular-nums">{won(total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
