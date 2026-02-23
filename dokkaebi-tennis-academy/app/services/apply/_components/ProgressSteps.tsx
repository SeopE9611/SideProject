'use client';

import type React from 'react';

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
    <div className="max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${ currentStep >= step.id ? 'bg-primary/10 border-primary/20 text-primary' : 'border-border text-muted-foreground bg-card' }`}
              >
                <step.icon className="h-6 w-6" />
              </div>
              <div className="mt-2 text-center">
                <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${currentStep > step.id ? 'bg-primary/30' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}
