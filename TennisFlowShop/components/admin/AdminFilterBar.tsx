import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminFilterBarProps = {
  children: ReactNode;
  quickFilters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function AdminFilterBar({
  children,
  quickFilters,
  actions,
  className,
}: AdminFilterBarProps) {
  return (
    <div
      className={cn("rounded-xl border border-border/70 bg-card p-4 shadow-sm", className)}
    >
      <div className="flex flex-row items-end justify-between gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {quickFilters ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          {quickFilters}
        </div>
      ) : null}
    </div>
  );
}
