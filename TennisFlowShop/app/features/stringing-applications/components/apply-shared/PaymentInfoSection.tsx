"use client";

import type React from "react";

import { CreditCard, Ticket } from "lucide-react";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bankLabelMap } from "@/lib/constants";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";

export type PaymentInfoSectionProps = {
  formData: any;
  setFormData: any;
  handleInputChange: any;

  usingPackage: boolean;
  packagePreview: any;
  packageInsufficient: boolean;
  packageRemaining: number;
  requiredPassCount: number;
  allowCardPayment?: boolean;
};

export default function PaymentInfoSection({
  formData,
  setFormData,
  handleInputChange,
  usingPackage,
  packagePreview,
  packageInsufficient,
  packageRemaining,
  requiredPassCount,
  allowCardPayment = false,
}: PaymentInfoSectionProps) {
  const nicePaymentsEnabled = isNicePaymentsEnabled();

  return (
    <div className="space-y-6">
      <SectionHeader
        align="center"
        title="결제 정보"
        description="패키지와 결제수단을 확인해주세요"
        className="mb-8"
      />

      {/* 패키지 자동 적용 안내/옵트아웃 */}
      {packagePreview?.has ? (
        <PublicSurface
          padding="sm"
          className={
            packageInsufficient
              ? "border-destructive/30 bg-destructive/10 dark:border-destructive/40 dark:bg-destructive/15"
              : "bg-muted/40 dark:bg-muted/30"
          }
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={
                packageInsufficient
                  ? "grid h-10 w-10 shrink-0 place-content-center rounded-full bg-destructive/10 text-destructive shadow-sm dark:bg-destructive/15"
                  : "grid h-10 w-10 shrink-0 place-content-center rounded-full bg-secondary text-foreground shadow-sm"
              }
            >
              <Ticket className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              {/* 헤더: 제목 + 상태 배지 */}
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={
                    packageInsufficient
                      ? "text-sm font-semibold text-foreground"
                      : "text-sm font-semibold text-primary"
                  }
                >
                  패키지 자동 적용
                </h3>
                <Badge variant={packageInsufficient ? "danger" : "info"}>
                  {packageInsufficient ? "적용 불가" : usingPackage ? "사용 중" : "사용 가능"}
                </Badge>
              </div>

              {/* 본문 설명 */}
              {packageInsufficient ? (
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  현재 패키지 남은 횟수는{" "}
                  <span className="font-semibold">{packageRemaining}회</span>
                  로, 이번 교체에 필요한 횟수(
                  <span className="font-semibold text-destructive">{requiredPassCount}회</span>
                  )보다 적어 자동 적용되지 않습니다.
                  <br />
                  이번 신청은{" "}
                  <span className="font-semibold text-destructive">일반 교체비 결제</span>로
                  진행됩니다.
                </p>
              ) : usingPackage ? (
                <p className="mt-2 text-sm text-foreground leading-relaxed">
                  이번 신청에는 패키지가 자동으로 적용됩니다.{" "}
                  <span className="font-semibold text-primary">교체비는 0원</span>
                  으로 처리되며, 패키지에서{" "}
                  <span className="font-semibold">{requiredPassCount}회</span>가 차감됩니다.
                </p>
              ) : (
                <p className="mt-2 text-sm text-foreground leading-relaxed">
                  패키지로 결제할 수 있는 상태입니다. 필요하다면 아래 옵션을 해제하여 이번 신청에도
                  패키지를 사용할 수 있습니다.
                </p>
              )}

              {/* 숫자 요약 뱃지들 */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs tabular-nums">
                <Badge variant="info">필요 {requiredPassCount}회</Badge>
                <Badge variant="info">잔여 {packagePreview.remaining}회</Badge>
                {packagePreview.expiresAt && (
                  <Badge variant="neutral">
                    만료일 {new Date(packagePreview.expiresAt).toLocaleDateString("ko-KR")}
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
                        총 {total}회 중 <span className="font-medium text-foreground">{used}</span>
                        회 사용
                      </span>
                      <span className="tabular-nums">{remainPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${remainPct}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* 옵트아웃 체크박스 */}
              <div className="mt-4 flex items-center gap-2">
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
                <Label
                  htmlFor="package-optout"
                  className={
                    formData.packageOptOut
                      ? "cursor-pointer text-xs text-muted-foreground"
                      : "cursor-pointer text-xs text-foreground"
                  }
                >
                  이번 신청에는 패키지 <span className="font-medium">사용 안 함</span>
                </Label>
              </div>
            </div>
          </div>
        </PublicSurface>
      ) : (
        /* 패키지 없음 카드 다크모드 적용 */
        <PublicSurface variant="muted" padding="sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted dark:bg-card grid place-content-center text-muted-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-foreground">
                패키지가 없거나 잔여 횟수가 없습니다.
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                패키지를 보유하면 교체비가 무료입니다. (배송/추가옵션비 제외)
              </p>
            </div>
          </div>
        </PublicSurface>
      )}

      {!usingPackage && (
        <div className="space-y-6">
          <PublicSurface variant="muted" padding="sm" className="space-y-3">
            <Label className="text-sm font-medium">결제수단</Label>
            <label
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 shadow-sm transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring ${
                formData.paymentMethod === "bank_transfer"
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border bg-card"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={formData.paymentMethod === "bank_transfer"}
                onChange={() => setFormData({ ...formData, paymentMethod: "bank_transfer" })}
              />
              <span className="font-medium">무통장입금</span>
            </label>
            {allowCardPayment && nicePaymentsEnabled && (
              <label
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 shadow-sm transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring ${
                  formData.paymentMethod === "nicepay"
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border bg-card"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="nicepay"
                  checked={formData.paymentMethod === "nicepay"}
                  onChange={() => setFormData({ ...formData, paymentMethod: "nicepay" })}
                />
                <span className="font-medium">카드/간편결제</span>
              </label>
            )}
          </PublicSurface>

          {formData.paymentMethod === "bank_transfer" && (
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
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-foreground transition-colors focus:border-transparent focus:ring-2 focus:ring-ring"
                >
                  <option value="" disabled hidden>
                    입금하실 은행을 선택해주세요.
                  </option>
                  <option value="kakao">{bankLabelMap.kakao.label}</option>
                </select>
              </div>

              {formData.shippingBank && (bankLabelMap as any)[formData.shippingBank] ? (
                <PublicSurface variant="muted" padding="sm">
                  <h3 className="mb-4 flex items-center font-semibold text-primary">
                    <CreditCard className="mr-2 h-5 w-5 shrink-0" />
                    계좌 정보
                  </h3>
                  <div className="space-y-3">
                    <PublicSurface
                      padding="sm"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3"
                    >
                      <span className="text-sm text-muted-foreground">은행</span>
                      <span className="font-medium text-foreground">
                        {(bankLabelMap as any)[formData.shippingBank].label}
                      </span>
                    </PublicSurface>
                    <PublicSurface
                      padding="sm"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3"
                    >
                      <span className="text-sm text-muted-foreground">계좌번호</span>
                      <span className="break-all font-mono font-medium tabular-nums text-foreground">
                        {(bankLabelMap as any)[formData.shippingBank].account}
                      </span>
                    </PublicSurface>
                    <PublicSurface
                      padding="sm"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3"
                    >
                      <span className="text-sm text-muted-foreground">예금주</span>
                      <span className="font-medium text-foreground">
                        {(bankLabelMap as any)[formData.shippingBank].holder}
                      </span>
                    </PublicSurface>
                  </div>
                </PublicSurface>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="shippingDepositor" className="text-sm font-medium">
                  입금자명 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="shippingDepositor"
                  name="shippingDepositor"
                  value={formData.shippingDepositor}
                  onChange={handleInputChange}
                  placeholder="입금자명을 입력하세요"
                  className="bg-card transition-colors focus-visible:ring-ring"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
