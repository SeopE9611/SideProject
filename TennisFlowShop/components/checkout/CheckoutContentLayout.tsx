import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CheckoutContentLayoutProps = {
  children: ReactNode;
  summary: ReactNode;
  intro?: ReactNode;
  isBusy?: boolean;
  className?: string;
  contentClassName?: string;
  summaryClassName?: string;
};

export default function CheckoutContentLayout({
  children,
  summary,
  intro,
  isBusy = false,
  className,
  contentClassName,
  summaryClassName,
}: CheckoutContentLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-7xl grid-cols-1 gap-y-5",
        "pb-[calc(96px+env(safe-area-inset-bottom))]",
        "bp-sm:gap-y-6",
        "bp-lg:grid-cols-[minmax(0,1fr)_360px]",
        "bp-lg:items-start bp-lg:gap-x-8 bp-lg:pb-0",
        className,
      )}
      aria-busy={isBusy || undefined}
    >
      {intro ? <div className="min-w-0 bp-lg:col-span-2">{intro}</div> : null}

      <div className={cn("min-w-0 space-y-5 bp-sm:space-y-6", contentClassName)}>{children}</div>

      <aside
        className={cn(
          "-mx-3 min-w-0 bp-sm:mx-0",
          "bp-lg:sticky",
          "bp-lg:top-[calc(var(--header-h,0px)+16px)]",
          "bp-lg:self-start",
          summaryClassName,
        )}
      >
        {summary}
      </aside>
    </div>
  );
}
