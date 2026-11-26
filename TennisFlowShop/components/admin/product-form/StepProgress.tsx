"use client";

import { Check, FileText, Palette, Activity, Package, ImageIcon } from "lucide-react";
import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const PRODUCT_FORM_STEPS: Step[] = [
  { id: "basic", label: "기본정보", icon: <FileText className="h-4 w-4" /> },
  { id: "options", label: "구매옵션", icon: <Palette className="h-4 w-4" /> },
  { id: "features", label: "성능특성", icon: <Activity className="h-4 w-4" /> },
  { id: "inventory", label: "재고관리", icon: <Package className="h-4 w-4" /> },
  { id: "images", label: "이미지", icon: <ImageIcon className="h-4 w-4" /> },
];

interface StepProgressProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
  allowFreeNavigation?: boolean;
  navigationDisabled?: boolean;
  onStepClick?: (stepId: string) => void;
}

export function StepProgress({
  steps,
  currentStep,
  completedSteps,
  allowFreeNavigation = false,
  navigationDisabled = false,
  onStepClick,
}: StepProgressProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="입력 단계" className="w-full">
      <ol className="flex items-start justify-between gap-0 overflow-visible pb-1">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = !allowFreeNavigation && index < currentIndex;
          const isClickable = !navigationDisabled && (allowFreeNavigation || isCompleted || isPast || isCurrent);
          const label = (
            <span
              className={cn(
                adminTypography.actionLabel,
                "text-center transition-colors duration-300",
                (isCurrent || isCompleted) ? "text-primary" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          );

          return (
            <li key={step.id} className="relative min-w-[4.75rem] flex-1">
              <div className="flex flex-col items-center gap-2">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute left-0 right-1/2 top-4 -translate-y-1/2 h-0.5 transition-colors duration-300",
                      isPast || isCompleted ? "bg-primary" : "bg-border",
                    )}
                    style={{ left: "-50%" }}
                  />
                )}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-1/2 right-0 top-4 -translate-y-1/2 h-0.5 transition-colors duration-300",
                      isPast && !isCurrent ? "bg-primary" : "bg-border",
                    )}
                    style={{ right: "-50%" }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "relative z-10 flex flex-col items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    allowFreeNavigation && "gap-2",
                    !isClickable && "cursor-not-allowed",
                  )}
                  aria-label={step.label}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300",
                      isCurrent &&
                        "scale-105 border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                      isCompleted && !isCurrent && "border-primary bg-primary text-primary-foreground",
                      !isCurrent && !isCompleted && "border-border bg-background text-muted-foreground",
                      isClickable && !isCurrent && "hover:border-primary/70 hover:bg-muted",
                      !isClickable && "opacity-50",
                    )}
                  >
                    {isCompleted && !isCurrent ? <Check className="h-4 w-4" /> : step.icon}
                  </span>
                  {allowFreeNavigation && label}
                </button>
                {!allowFreeNavigation && label}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
