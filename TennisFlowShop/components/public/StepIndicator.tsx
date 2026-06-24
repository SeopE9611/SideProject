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
};

export function StepIndicator({
  steps,
  currentStep,
  className,
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
                "flex min-w-36 flex-1 items-start gap-3 rounded-lg border border-border bg-card p-3",
                isCurrent && "border-primary bg-primary/5",
                isComplete && "bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-ui-caption font-medium text-muted-foreground",
                  isCurrent &&
                    "border-primary bg-primary text-primary-foreground",
                  isComplete && "border-primary text-primary",
                )}
                aria-hidden="true"
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span className="space-y-0.5">
                <span className="block text-ui-body-sm font-medium text-foreground">
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
