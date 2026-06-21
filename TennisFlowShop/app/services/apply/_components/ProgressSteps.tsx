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

export default function ProgressSteps({ steps, currentStep }: Props) {
  return (
    <div className="mx-auto w-full max-w-[800px]">
      <div className="mb-6 flex items-center justify-between sm:mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12 ${currentStep >= step.id ? "bg-secondary border-border text-foreground" : "border-border text-muted-foreground bg-card"}`}
                aria-current={currentStep === step.id ? "step" : undefined}
              >
                <step.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-sm font-medium ${currentStep >= step.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 transition-all duration-300 sm:mx-4 ${currentStep > step.id ? "bg-primary/30" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
