import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CatalogResultsPanelProps = {
  eyebrow: string;
  title: string;
  description?: string;
  total: number;
  visibleCount: number;
  countPrefix?: string;
  countSuffix?: string;
  isCountLoading?: boolean;
  isRefreshing?: boolean;
  toolbar: ReactNode;
  activeFilters?: ReactNode;
  className?: string;
};

export function CatalogResultsPanel({ eyebrow, title, description, total, visibleCount, countPrefix = "총", countSuffix = "개", isCountLoading = false, isRefreshing = false, toolbar, activeFilters, className }: CatalogResultsPanelProps) {
  return (
    <section className={cn("overflow-hidden rounded-panel border border-border bg-card shadow-soft", className)}>
      <div className="space-y-3 p-4 bp-sm:p-5">
        <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-end bp-sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-ui-label font-semibold uppercase tracking-[0.14em] text-brand-highlight-ink">{eyebrow}</p>
            <h2 className="text-ui-card-title-lg font-semibold text-foreground">{title}</h2>
            {description ? <p className="max-w-2xl text-ui-body-sm text-muted-foreground">{description}</p> : null}
            <div className="flex min-h-6 flex-wrap items-center gap-x-1 text-ui-body font-semibold tabular-nums text-foreground" aria-live="polite">
              {countPrefix} {isCountLoading ? <Skeleton className="inline-block h-5 w-12 align-middle" /> : <span className="font-semibold text-primary">{total}</span>}{countSuffix}
              {isCountLoading ? <Skeleton className="ml-2 inline-block h-5 w-10 align-middle" /> : <span className="ml-1 text-ui-body-sm font-normal text-muted-foreground">(표시중 {visibleCount}개)</span>}
            </div>
          </div>
          {isRefreshing ? <span className="w-fit rounded-full border border-border bg-muted/30 px-2.5 py-1 text-ui-label font-medium text-muted-foreground">조회 중...</span> : null}
        </div>
      </div>
      <div className="border-t border-border bg-muted/15 p-3 bp-sm:p-4">{toolbar}</div>
      {activeFilters ? <div className="border-t border-border bg-muted/10 p-3 bp-sm:p-4">{activeFilters}</div> : null}
    </section>
  );
}
