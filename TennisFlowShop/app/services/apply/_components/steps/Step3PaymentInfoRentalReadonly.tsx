"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/public/SectionHeader";
import { ReceiptText } from "lucide-react";

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
export default function Step3PaymentInfoRentalReadonly({
  won,
  deposit,
  fee,
  stringPrice,
  stringingFee,
  total,
}: Props) {
  return (
    <div className="space-y-6">
      <SectionHeader
        align="center"
        title="결제 정보"
        description="대여 결제 내역을 확인해주세요"
        className="mb-8"
      />

      <Card className="rounded-2xl border border-border">
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-ui-body-lg">
            <ReceiptText className="h-4 w-4 shrink-0" />
            대여 결제 요약
          </CardTitle>
          <CardDescription className="text-ui-body-sm">
            대여 결제에 <span className="font-medium">스트링 상품</span>과{" "}
            <span className="font-medium">교체 서비스 비용</span>까지 포함되어 있어 추가 결제정보
            입력이 필요하지 않습니다.
            {/* {rentalId ? <span className="ml-1 text-ui-label text-muted-foreground">(rentalId: {rentalId})</span> : null} */}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 text-ui-body-sm sm:p-6 sm:pt-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">보증금</span>
            <span className="font-medium tabular-nums">{won(deposit)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">대여료</span>
            <span className="font-medium tabular-nums">{won(fee)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">스트링 상품</span>
            <span className="font-medium tabular-nums">{won(stringPrice)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">교체 서비스</span>
            <span className="font-medium tabular-nums">{won(stringingFee)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <span className="font-semibold">합계</span>
            <span className="font-semibold tabular-nums">{won(total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
