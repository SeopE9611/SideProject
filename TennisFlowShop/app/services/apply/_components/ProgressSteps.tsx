"use client";

import type React from "react";
import { Check } from "lucide-react";

type StepItem = {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  steps: StepItem[];
  currentStep: number;
};

export default function ProgressSteps({ steps, currentStep }: Props) {
  const current = steps.find((step) => step.id === currentStep) ?? steps[0];
  const progress = Math.max(0, Math.min(100, (currentStep / steps.length) * 100));

  return (
    <div className="w-full">
      <div className="rounded-panel border border-border bg-card p-4 shadow-soft bp-md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ui-label font-semibold text-brand-highlight-foreground">
              {currentStep} / {steps.length}
            </p>
            <p className="mt-1 truncate text-ui-body font-semibold text-foreground">
              {current?.title}
            </p>
          </div>
          <p className="shrink-0 text-ui-label text-muted-foreground">현재 단계</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-brand-highlight" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="hidden grid-cols-4 gap-0 bp-md:grid">
        {steps.map((step, index) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div key={step.id} className="relative min-w-0 px-2">
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-1/2 top-5 h-0.5 w-full ${isDone ? "bg-border" : "bg-muted"}`}
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-ui-body-sm font-semibold transition-colors ${
                    isCurrent
                      ? "border-brand-highlight bg-brand-highlight text-brand-highlight-foreground"
                      : isDone
                        ? "border-border bg-card text-foreground"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <p
                  className={`mt-2 truncate text-ui-body-sm font-semibold ${
                    isCurrent ? "text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-1 line-clamp-2 text-ui-label text-muted-foreground">
                  {isDone ? "완료" : isCurrent ? step.description : "예정"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
