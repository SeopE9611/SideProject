"use client";

import React from "react";
import { PrimaryCTAGroup } from "@/components/public/PrimaryCTAGroup";
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
}: Props) {
  const primaryAction =
    currentStep < 4 ? (
      <Button
        type="button"
        onClick={onNext}
        disabled={!isStepValid(currentStep)}
        variant="highlight"
        className="px-6 py-3 transition-all duration-200 disabled:opacity-50"
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
        className="px-6 py-3 transition-all duration-200 disabled:opacity-50"
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
      className="px-8 py-3 transition-colors duration-200"
    >
      이전
    </Button>
  );

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-border bg-card/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-soft backdrop-blur-sm bp-sm:-mx-5 bp-sm:px-5 bp-lg:static bp-lg:mx-0 bp-lg:flex bp-lg:bg-transparent bp-lg:p-0 bp-lg:pt-5 bp-lg:shadow-none bp-lg:backdrop-blur-0 bp-lg:justify-end">
      <PrimaryCTAGroup
        primary={primaryAction}
        secondary={secondaryAction}
        align="right"
        className="w-full sm:flex-row-reverse bp-lg:w-auto"
      />
    </div>
  );
}
