"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface StepNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isUploading?: boolean;
  canGoNext?: boolean;
  backHref?: string;
  onBackClick?: (e: React.MouseEvent) => void;
  submitLabel?: string;
  className?: string;
}

export function StepNavigation({
  currentStepIndex,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting = false,
  isUploading = false,
  canGoNext = true,
  backHref = "/admin/products",
  onBackClick,
  submitLabel = "저장",
  className,
}: StepNavigationProps) {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-2">
        {/* Back to list button */}
        <Button
          variant="outline"
          type="button"
          asChild
          className="bg-muted/40 hover:bg-muted border-border"
        >
          <Link
            href={backHref}
            data-no-unsaved-guard
            onClick={onBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Previous step */}
        {!isFirstStep && (
          <Button
            variant="outline"
            type="button"
            onClick={onPrevious}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
        )}

        {/* Next step or Submit */}
        {isLastStep ? (
          <Button
            type="submit"
            variant="default"
            disabled={isSubmitting || isUploading}
            onClick={onSubmit}
            className="min-w-[100px] gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {submitLabel}
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="default"
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="gap-1"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  current: number;
  total: number;
  className?: string;
}

export function StepIndicator({ current, total, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <span className="font-semibold text-primary">{current}</span>
      <span>/</span>
      <span>{total}</span>
      <span className="ml-1">단계</span>
    </div>
  );
}
