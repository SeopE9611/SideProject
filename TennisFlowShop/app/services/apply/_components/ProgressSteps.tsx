"use client";

import type React from "react";

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

const compactTitleMap: Record<string, string> = {
  "신청자/수령 정보": "신청자",
  "라켓·스트링 정보": "라켓정보",
  "결제 정보": "결제",
  요청사항: "요청",
};

export default function ProgressSteps({ steps, currentStep }: Props) {
  return (
    <div className="mx-auto w-full max-w-[800px]">
      <div className="mb-6 grid grid-cols-4 gap-1 sm:mb-8 sm:gap-2">
        {steps.map((step, index) => {
          const compactTitle = compactTitleMap[step.title] ?? step.title;

          return (
            <div key={step.id} className="relative flex min-w-0 flex-col items-center">
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-1/2 top-5 h-0.5 w-full translate-x-5 transition-all duration-300 sm:top-6 sm:translate-x-6 ${currentStep > step.id ? "bg-primary/30" : "bg-muted"}`}
                  aria-hidden="true"
                />
              )}
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12 ${currentStep >= step.id ? "bg-secondary border-border text-foreground" : "border-border text-muted-foreground bg-card"}`}
                aria-current={currentStep === step.id ? "step" : undefined}
              >
                <step.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="mt-2 min-h-[32px] text-center sm:min-h-[44px]">
                <p
                  className={`whitespace-nowrap text-[11px] font-medium leading-tight sm:text-sm ${currentStep >= step.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  <span className="block sm:hidden">{compactTitle}</span>
                  <span className="hidden sm:block">{step.title}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
