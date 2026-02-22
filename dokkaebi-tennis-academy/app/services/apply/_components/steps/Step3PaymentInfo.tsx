'use client';

import type React from 'react';

import { CreditCard, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bankLabelMap } from '@/lib/constants';

type Props = {
  formData: any;
  setFormData: any;
  handleInputChange: any;

  usingPackage: boolean;
  packagePreview: any;
  packageInsufficient: boolean;
  packageRemaining: number;
  requiredPassCount: number;
};

export default function Step3PaymentInfo({ formData, setFormData, handleInputChange, usingPackage, packagePreview, packageInsufficient, packageRemaining, requiredPassCount }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary from-background  mb-4">
          <CreditCard className="h-8 w-8 text-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">결제 정보</h2>
        <p className="text-muted-foreground">결제 방법을 선택해주세요</p>
      </div>

      {/* 패키지 자동 적용 안내/옵트아웃 */}
      {packagePreview?.has ? (
        <div
          className={
            packageInsufficient
              ? 'mt-6 rounded-2xl border border-border bg-destructive dark:border-destructive dark:bg-destructive p-5'
              : 'mt-6 rounded-2xl border border-border bg-primary from-background  dark:border-border dark:from-background dark:to-card p-5'
          }
        >
          <div className="flex items-start gap-4">
            <div className={packageInsufficient ? 'h-10 w-10 shrink-0 rounded-full bg-destructive text-foreground grid place-content-center shadow-sm' : 'h-10 w-10 shrink-0 rounded-full bg-primary text-foreground grid place-content-center shadow-sm'}>
              <Ticket className="h-5 w-5" />
            </div>

            <div className="flex-1">
              {/* 헤더: 제목 + 상태 배지 */}
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={packageInsufficient ? 'text-sm font-semibold text-accent-foreground dark:text-destructive' : 'text-sm font-semibold text-primary dark:text-muted-foreground'}>패키지 자동 적용</h3>
                <Badge
                  className={packageInsufficient ? 'bg-accent text-destructive dark:bg-destructive dark:text-destructive border border-border/80' : 'bg-accent text-primary dark:bg-primary dark:text-muted-foreground border border-border/80'}
                >
                  {packageInsufficient ? '적용 불가' : usingPackage ? '사용 중' : '사용 가능'}
                </Badge>
              </div>

              {/* 본문 설명 */}
              {packageInsufficient ? (
                <p className="mt-2 text-sm text-accent-foreground dark:text-destructive leading-relaxed">
                  현재 패키지 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>
                  로, 이번 교체에 필요한 횟수(<span className="font-semibold">{requiredPassCount}회</span>)보다 적어 자동 적용되지 않습니다.
                  <br />
                  이번 신청은 일반 교체비 결제로 진행됩니다.
                </p>
              ) : usingPackage ? (
                <p className="mt-2 text-sm text-foreground leading-relaxed">
                  이번 신청에는 패키지가 자동으로 적용됩니다. <span className="font-semibold text-primary">교체비는 0원</span>
                  으로 처리되며, 패키지에서 <span className="font-semibold">{requiredPassCount}회</span>가 차감됩니다.
                </p>
              ) : (
                <p className="mt-2 text-sm text-foreground leading-relaxed">패키지로 결제할 수 있는 상태입니다. 필요하다면 아래 옵션을 해제하여 이번 신청에도 패키지를 사용할 수 있습니다.</p>
              )}

              {/* 숫자 요약 뱃지들 */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="border-border text-primary">
                  필요 {requiredPassCount}회
                </Badge>
                <Badge variant="outline" className="border-border text-primary">
                  잔여 {packagePreview.remaining}회
                </Badge>
                {packagePreview.expiresAt && (
                  <Badge variant="outline" className="border-border text-primary">
                    만료일 {new Date(packagePreview.expiresAt).toLocaleDateString('ko-KR')}
                  </Badge>
                )}
              </div>

              {/* 잔여 게이지 */}
              {(() => {
                const total = packagePreview.packageSize ?? 0;
                const remaining = packagePreview.remaining ?? 0;
                const used = total ? Math.max(0, total - remaining) : 0;
                const remainPct = total ? Math.round((remaining / total) * 100) : 0;

                if (!total) return null;

                return (
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        총 {total}회 중 <span className="font-medium text-foreground">{used}</span>회 사용
                      </span>
                      <span className="tabular-nums">{remainPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-muted">
                      <div className="h-full bg-primary dark:bg-primary" style={{ width: `${remainPct}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* 옵트아웃 체크박스 */}
              <div className="mt-4 inline-flex items-center gap-2">
                <Checkbox
                  id="package-optout"
                  checked={!!formData.packageOptOut}
                  disabled={packageInsufficient}
                  onCheckedChange={(v: any) => {
                    if (packageInsufficient) return; // 부족하면 변경 불가
                    setFormData({ ...formData, packageOptOut: v === true });
                  }}
                  className="h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:border-border"
                />
                <Label htmlFor="package-optout" className={formData.packageOptOut ? 'cursor-pointer text-xs text-muted-foreground' : 'cursor-pointer text-xs text-foreground'}>
                  이번 신청에는 패키지 <span className="font-medium">사용 안 함</span>
                </Label>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 패키지 없음 카드 다크모드 적용 */
        <div className="rounded-2xl border border-border bg-background dark:bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted dark:bg-card grid place-content-center text-muted-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium dark:text-foreground">패키지가 없거나 잔여 횟수가 없습니다.</div>
              <p className="text-sm text-muted-foreground mt-1">패키지를 보유하면 교체비가 0원으로 처리됩니다. (배송/추가옵션비 제외)</p>
            </div>
          </div>
        </div>
      )}

      {!usingPackage && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="shippingBank" className="text-sm font-medium">
              은행 선택 <span className="text-destructive">*</span>
            </Label>
            <select
              id="shippingBank"
              name="shippingBank"
              value={formData.shippingBank}
              onChange={(e) => setFormData({ ...formData, shippingBank: e.target.value })}
              className="w-full border border-border px-3 py-2 rounded-md bg-card dark:text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            >
              <option value="" disabled hidden>
                입금하실 은행을 선택해주세요.
              </option>
              {Object.entries(bankLabelMap as any).map(([key, info]: any) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          {formData.shippingBank && (bankLabelMap as any)[formData.shippingBank] ? (
            <div className="bg-primary  to-card dark:from-background dark:to-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-primary mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                계좌 정보
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-card rounded-lg border dark:border-border">
                  <span className="text-sm text-muted-foreground">은행</span>
                  <span className="font-medium text-foreground">{(bankLabelMap as any)[formData.shippingBank].label}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-card rounded-lg border dark:border-border">
                  <span className="text-sm text-muted-foreground">계좌번호</span>
                  <span className="font-mono font-medium text-foreground">{(bankLabelMap as any)[formData.shippingBank].account}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-card rounded-lg border dark:border-border">
                  <span className="text-sm text-muted-foreground">예금주</span>
                  <span className="font-medium text-foreground">{(bankLabelMap as any)[formData.shippingBank].holder}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="shippingDepositor" className="text-sm font-medium">
              입금자명 <span className="text-destructive">*</span>
            </Label>
            <Input id="shippingDepositor" name="shippingDepositor" value={formData.shippingDepositor} onChange={handleInputChange} placeholder="입금자명을 입력하세요" className="focus:ring-2 focus:ring-ring transition-all duration-200" />
          </div>
        </div>
      )}
    </div>
  );
}
