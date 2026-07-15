"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

type Props = {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;

  /** currentStep이 유효한지 여부(다음 버튼 disabled 판단용) */
  isStepValid: (step: number) => boolean;

  isSubmitting: boolean;
  isOrderSlotBlocked: boolean;

  /** page.tsx의 handleSubmit 그대로 넘겨서 클릭 시 동일 로직 실행 */
  handleSubmit: (e: React.FormEvent) => void;
  finalAction?: React.ReactNode;
  compactSummary?: string;
};

export default function ApplyStepFooter({
  currentStep,
  onPrev,
  onNext,
  isStepValid,
  isSubmitting,
  isOrderSlotBlocked,
  handleSubmit,
  finalAction,
  compactSummary,
}: Props) {
  const primaryAction =
    currentStep < 4 ? (
      <Button
        type="button"
        onClick={onNext}
        disabled={!isStepValid(currentStep)}
        variant="highlight"
        className="min-h-11 px-6 py-3 transition-all duration-200 disabled:opacity-50"
      >
        다음
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    ) : finalAction ? (
      finalAction
    ) : (
      <Button
        type="button"
        disabled={isSubmitting || isOrderSlotBlocked}
        onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
        variant="highlight"
        className="min-h-11 px-6 py-3 transition-all duration-200 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-border mr-2" />
            신청서 제출 중...
          </>
        ) : (
          <>
            신청 완료하기
            <CheckCircle className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    );
  const secondaryAction = (
    <Button
      type="button"
      variant="outline"
      onClick={onPrev}
      disabled={currentStep === 1}
      className="min-h-11 px-8 py-3 transition-colors duration-200"
    >
      이전
    </Button>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-soft bp-sm:px-5 bp-lg:static bp-lg:inset-auto bp-lg:mx-0 bp-lg:mt-8 bp-lg:flex bp-lg:justify-end bp-lg:bg-transparent bp-lg:p-0 bp-lg:pt-5 bp-lg:shadow-none">
      <div className="mx-auto w-full max-w-[720px] bp-lg:mx-0 bp-lg:w-auto bp-lg:max-w-none">
        {compactSummary ? (
          <p className="mb-2 truncate text-ui-label font-medium text-muted-foreground bp-lg:hidden">
            {compactSummary}
          </p>
        ) : null}
        <div className={currentStep === 1 ? "grid grid-cols-1 gap-2 bp-lg:flex bp-lg:justify-end" : "grid grid-cols-2 gap-2 bp-lg:flex bp-lg:flex-row-reverse bp-lg:justify-end"}>
          <div className="[&>*]:h-11 [&>*]:w-full bp-lg:[&>*]:w-auto">{primaryAction}</div>
          {currentStep > 1 ? (
            <div className="[&>*]:h-11 [&>*]:w-full bp-lg:[&>*]:w-auto">{secondaryAction}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
