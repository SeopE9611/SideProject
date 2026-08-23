import { Fragment } from "react";

import AdminPageShell from "@/components/admin/AdminPageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AdminListPageSkeletonProps = {
  columnsClassName: string;
  columnCount: number;
  rows?: number;
  summaryCount?: number;
  summaryVariant?: "strip" | "cards";
  filterColumnsClassName?: string;
  filterFieldCount?: number;
  secondaryFilterFieldCount?: number;
  secondaryFilterActionCount?: number;
  quickFilterCount?: number;
  headerActionCount?: number;
  filterActionCount?: number;
  showGuide?: boolean;
  guideVariant?: "panel" | "summary";
  selectionColumn?: boolean;
  showPagination?: boolean;
  className?: string;
};

export default function AdminListPageSkeleton({
  columnsClassName,
  columnCount,
  rows = 6,
  summaryCount = 0,
  summaryVariant = "strip",
  filterColumnsClassName = "grid-cols-1",
  filterFieldCount = 1,
  secondaryFilterFieldCount = 0,
  secondaryFilterActionCount = 0,
  quickFilterCount = 0,
  headerActionCount = 0,
  filterActionCount = 0,
  showGuide = false,
  guideVariant = "panel",
  selectionColumn = false,
  showPagination = true,
  className,
}: AdminListPageSkeletonProps) {
  const safeColumnCount = Math.max(1, columnCount);
  const safeRows = Math.max(0, rows);
  const safeSummaryCount = Math.max(0, summaryCount);
  const safeFilterFieldCount = Math.max(0, filterFieldCount);
  const safeSecondaryFilterFieldCount = Math.max(
    0,
    secondaryFilterFieldCount,
  );
  const safeSecondaryFilterActionCount = Math.max(
    0,
    secondaryFilterActionCount,
  );
  const safeQuickFilterCount = Math.max(0, quickFilterCount);
  const safeHeaderActionCount = Math.max(0, headerActionCount);
  const safeFilterActionCount = Math.max(0, filterActionCount);
  const firstInformationCell = selectionColumn ? 1 : 0;

  return (
    <AdminPageShell variant="wide" className={cn("space-y-4", className)}>
      <div aria-busy="true" aria-label="관리자 목록을 불러오는 중" className="space-y-4">
        <span className="sr-only">관리자 목록을 불러오는 중입니다.</span>

        <div
          aria-hidden="true"
          className="flex items-start justify-between gap-3 px-1 py-0.5"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-[34rem] max-w-full" />
              <Skeleton className="h-3 w-[42rem] max-w-full" />
            </div>
          </div>
          {safeHeaderActionCount > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
              {Array.from({ length: safeHeaderActionCount }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-28 rounded-md" />
              ))}
            </div>
          ) : null}
        </div>

        {showGuide && guideVariant === "summary" ? (
          <div
            aria-hidden="true"
            className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3"
          >
            <Skeleton className="h-4 w-36" />
          </div>
        ) : null}

        {showGuide && guideVariant === "panel" ? (
          <div
            aria-hidden="true"
            className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-[38rem] max-w-full" />
              </div>
              <Skeleton className="h-8 w-28 shrink-0 rounded-md" />
            </div>
          </div>
        ) : null}

        {safeSummaryCount > 0 ? (
          <section aria-hidden="true">
            {summaryVariant === "strip" ? (
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                <div
                  className="grid gap-px bg-border/60"
                  style={{
                    gridTemplateColumns: `repeat(${safeSummaryCount}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: safeSummaryCount }).map((_, index) => (
                    <div
                      key={index}
                      className="flex min-w-0 items-center justify-between gap-3 bg-card px-4 py-3"
                    >
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-14" />
                      </div>
                      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${safeSummaryCount}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: safeSummaryCount }).map((_, index) => (
                  <div key={index} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <div
          aria-hidden="true"
          className="rounded-lg border border-border bg-background px-3 py-2.5"
        >
          <div className="flex items-end justify-between gap-3">
            <div
              className={cn(
                "grid min-w-0 flex-1 items-end gap-2",
                filterColumnsClassName,
              )}
            >
              {Array.from({ length: safeFilterFieldCount }).map((_, index) => (
                <div key={index} className="min-w-0 space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
            {safeFilterActionCount > 0 ? (
              <div className="flex shrink-0 items-center gap-2">
                {Array.from({ length: safeFilterActionCount }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-24 rounded-md" />
                ))}
              </div>
            ) : null}
          </div>
          {safeSecondaryFilterFieldCount > 0 || safeSecondaryFilterActionCount > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: safeSecondaryFilterFieldCount }).map((_, index) => (
                  <Fragment key={index}>
                    <Skeleton className="h-9 w-[150px] rounded-md" />
                    {safeSecondaryFilterFieldCount === 2 && index === 0 ? (
                      <span className="text-xs text-muted-foreground">~</span>
                    ) : null}
                  </Fragment>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: safeSecondaryFilterActionCount }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-16 rounded-md" />
                ))}
              </div>
            </div>
          ) : null}
          {safeQuickFilterCount > 0 ? (
            <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
              <Skeleton className="h-3 w-14" />
              {Array.from({ length: safeQuickFilterCount }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-20 rounded-md" />
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-3 border-t border-border/50 pt-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <section
          aria-hidden="true"
          className="overflow-hidden rounded-lg border border-border bg-background"
        >
          <header className="border-b border-border bg-muted/15 px-4 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-[34rem] max-w-full" />
              </div>
              <Skeleton className="h-3 w-20 shrink-0" />
            </div>
          </header>
          <div
            role="table"
            aria-label="관리자 목록 로딩"
            data-columns-class={columnsClassName}
            className="min-w-0"
          >
            <div
              role="row"
              className={cn(
                "grid min-h-10 min-w-0 items-center border-b border-border bg-muted/20",
                columnsClassName,
              )}
            >
              {Array.from({ length: safeColumnCount }).map((_, index) => (
                <div
                  key={index}
                  role="columnheader"
                  className={cn(
                    "min-w-0 px-4 py-2.5",
                    selectionColumn && index === 0 && "px-2 text-center",
                    index === safeColumnCount - 1 && "text-right",
                  )}
                >
                  <Skeleton
                    className={cn(
                      "h-3",
                      selectionColumn && index === 0
                        ? "mx-auto w-4"
                        : index === safeColumnCount - 1
                          ? "ml-auto w-12"
                          : index === 0 || (selectionColumn && index === 1)
                            ? "w-24"
                            : "w-20",
                    )}
                  />
                </div>
              ))}
            </div>
            <div role="rowgroup">
              {Array.from({ length: safeRows }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  role="row"
                  className={cn(
                    "grid min-h-20 min-w-0 items-center border-b border-border last:border-b-0",
                    columnsClassName,
                  )}
                >
                  {Array.from({ length: safeColumnCount }).map((__, cellIndex) => (
                    <div
                      key={cellIndex}
                      role="cell"
                      className={cn(
                        "min-w-0 px-4 py-2.5",
                        selectionColumn && cellIndex === 0 && "px-2 text-center",
                        cellIndex === safeColumnCount - 1 && "text-right",
                      )}
                    >
                      {selectionColumn && cellIndex === 0 ? (
                        <Skeleton className="mx-auto h-4 w-4 rounded-sm" />
                      ) : cellIndex === firstInformationCell ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[75%] max-w-48" />
                          <Skeleton className="h-3 w-[55%] max-w-36" />
                          <Skeleton className="h-3 w-[88%] max-w-56" />
                        </div>
                      ) : cellIndex === safeColumnCount - 1 ? (
                        <Skeleton className="ml-auto h-8 w-20 rounded-md" />
                      ) : (
                        <div className="space-y-2">
                          <Skeleton
                            className={cn(
                              "h-4",
                              cellIndex % 3 === 0
                                ? "w-24"
                                : cellIndex % 3 === 1
                                  ? "w-28"
                                  : "w-32",
                            )}
                          />
                          <Skeleton
                            className={cn(
                              "h-3",
                              cellIndex % 3 === 0
                                ? "w-16"
                                : cellIndex % 3 === 1
                                  ? "w-20"
                                  : "w-24",
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {showPagination ? (
              <div role="rowgroup" className="border-t border-border">
                <div role="row">
                  <div
                    role="cell"
                    aria-colspan={safeColumnCount}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <Skeleton className="h-3 w-32" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-16 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
