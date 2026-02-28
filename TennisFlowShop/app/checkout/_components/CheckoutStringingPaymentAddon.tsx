'use client';

import { AlertTriangle, CheckCircle2, Info, Ticket } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type Props = {
  packagePreview: {
    has: boolean;
    remaining?: number;
    expiresAt?: string;
  };
  packageRemaining: number;
  requiredPassCount: number;
  canApplyPackage: boolean;
  usingPackage: boolean;
  packageInsufficient: boolean;
  packageOptOut: boolean;
  onPackageOptOutChange: (next: boolean) => void;
};

export default function CheckoutStringingPaymentAddon({
  packagePreview,
  packageRemaining,
  requiredPassCount,
  canApplyPackage,
  usingPackage,
  packageInsufficient,
  packageOptOut,
  onPackageOptOutChange,
}: Props) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          교체 서비스는 이번 주문과 함께 접수됩니다.
        </p>
        <p className="text-xs text-muted-foreground">아래 은행/입금자명은 상품 + 교체 서비스 전체 주문 기준입니다.</p>
      </div>

      <div className={packageInsufficient ? 'rounded-md border border-destructive/40 bg-destructive/10 p-3' : 'rounded-md border border-border bg-background p-3'}>
        <div className="flex items-center gap-2 mb-2">
          <Ticket className={packageInsufficient ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-primary'} />
          <p className="text-sm font-semibold text-foreground">교체 패키지 적용 상태</p>
          <Badge variant="outline" className={packageInsufficient ? 'border-destructive/40 text-destructive' : 'border-border text-foreground'}>
            {packageInsufficient ? '횟수 부족' : usingPackage ? '자동 적용 중' : canApplyPackage ? '적용 가능' : '미적용'}
          </Badge>
        </div>

        {packagePreview.has ? (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">패키지 잔여 {packageRemaining}회</Badge>
              <Badge variant="outline">이번 신청 필요 {requiredPassCount}회</Badge>
            </div>

            {packageInsufficient ? (
              <p className="text-xs text-destructive mt-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                잔여 횟수가 부족하여 이번 주문의 교체 서비스는 일반 결제로 접수됩니다.
              </p>
            ) : canApplyPackage ? (
              <p className="text-xs text-foreground mt-2 flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary" />
                잔여 횟수가 충분하여 패키지가 자동으로 적용됩니다.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">이번 주문에 적용 가능한 교체 횟수가 없어 일반 결제로 접수됩니다.</p>
            )}

            {canApplyPackage && (
              <div className="mt-3 flex items-center gap-2">
                <Checkbox id="checkout-package-optout" checked={packageOptOut} onCheckedChange={(v) => onPackageOptOutChange(v === true)} />
                <Label htmlFor="checkout-package-optout" className="cursor-pointer text-xs text-muted-foreground">
                  이번 주문에서는 패키지 사용 안 함
                </Label>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">사용 가능한 교체 패키지가 없어 이번 주문의 교체 서비스는 일반 결제로 접수됩니다.</p>
        )}
      </div>
    </div>
  );
}
