'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

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
};

export default function ApplyStepFooter({ currentStep, onPrev, onNext, isStepValid, isSubmitting, isOrderSlotBlocked, handleSubmit }: Props) {
  return (
    <div className="flex justify-between mt-12 pt-8 border-t dark:border-slate-700">
      <Button type="button" variant="outline" onClick={onPrev} disabled={currentStep === 1} className="px-8 py-3 hover:bg-background dark:hover:bg-slate-700 transition-colors duration-200">
        이전
      </Button>

      {currentStep < 4 ? (
        <Button type="button" onClick={onNext} disabled={!isStepValid(currentStep)} className="px-8 py-3 bg-primary 0  hover: hover:to-purple-700 text-foreground transition-all duration-200 disabled:opacity-50">
          다음
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          disabled={isSubmitting || isOrderSlotBlocked}
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
          className="px-8 py-3 bg-primary 0  hover: hover:to-teal-700 text-foreground transition-all duration-200 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-border mr-2" />
              신청서 제출 중...
            </>
          ) : (
            <>
              신청서 제출하기
              <CheckCircle className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
