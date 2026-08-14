import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminFilterBarProps = {
  children: ReactNode;
  quickFilters?: ReactNode;
  actions?: ReactNode;
  activeFilters?: ReactNode;
  className?: string;
};

export default function AdminFilterBar({
  children,
  quickFilters,
  actions,
  activeFilters,
  className,
}: AdminFilterBarProps) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-background px-3 py-2.5", className)}
    >
      <div className="flex flex-col items-stretch gap-3 min-[1366px]:flex-row min-[1366px]:items-end min-[1366px]:justify-between">
        <div className="min-w-0 flex-1">{children}</div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
      {quickFilters ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          {quickFilters}
        </div>
      ) : null}
      {activeFilters ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-ui-label text-muted-foreground">
          {activeFilters}
        </div>
      ) : null}
    </div>
  );
}
