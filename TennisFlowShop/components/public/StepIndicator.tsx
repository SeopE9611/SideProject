import { cn } from "@/lib/utils";

export type Step = {
  id: string;
  label: string;
  description?: string;
};

export type StepIndicatorProps = {
  steps: Step[];
  currentStep: string;
  className?: string;
  variant?: "standard" | "v2";
};

export function StepIndicator({
  steps,
  currentStep,
  className,
  variant = "standard",
}: StepIndicatorProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const safeCurrentStepId = steps[safeCurrentIndex]?.id;

  return (
    <nav aria-label="진행 단계" className={cn("overflow-x-auto", className)}>
      <ol className="flex min-w-max gap-2">
        {steps.map((step, index) => {
          const isCurrent = step.id === safeCurrentStepId;
          const isComplete = index < safeCurrentIndex;

          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex min-w-36 flex-1 items-start gap-3 border border-border bg-card p-3",
                variant === "standard" && "rounded-lg",
                variant === "v2" && "rounded-control",
                variant === "standard" && isCurrent && "border-primary bg-primary/5",
                variant === "standard" && isComplete && "bg-muted/40",
                variant === "v2" && isCurrent && "border-foreground bg-background",
                variant === "v2" && isComplete && "border-success/45 bg-success/10",
                variant === "v2" && !isCurrent && !isComplete && "bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-ui-caption font-ui-medium text-muted-foreground",
                  variant === "standard" &&
                    isCurrent &&
                    "border-primary bg-primary text-primary-foreground",
                  variant === "standard" && isComplete && "border-primary text-primary",
                  variant === "v2" &&
                    isCurrent &&
                    "border-foreground bg-background text-foreground",
                  variant === "v2" &&
                    isComplete &&
                    "border-success bg-success text-success-foreground",
                )}
                aria-hidden="true"
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span className="space-y-0.5">
                <span className="block text-ui-body-sm font-ui-medium text-foreground">
                  {step.label}
                </span>
                {step.description && (
                  <span className="block text-ui-label text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
