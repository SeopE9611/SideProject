import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TablePageSkeletonProps = {
  titleWidthClassName?: string;
  descriptionWidthClassName?: string;
  statsCount?: number;
  rows?: number;
  columnCount?: number;
  toolbarVariant?: "full" | "compact" | "none";
  className?: string;
};

export function TablePageSkeleton({
  titleWidthClassName = "w-48",
  descriptionWidthClassName = "w-80",
  statsCount = 0,
  rows = 6,
  columnCount = 7,
  toolbarVariant = "full",
  className,
}: TablePageSkeletonProps) {
  return (
    <div className={cn("container py-10", className)}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className={cn("h-10 rounded-xl", titleWidthClassName)} />
          <Skeleton
            className={cn(
              "h-4 max-w-full rounded-lg",
              descriptionWidthClassName,
            )}
          />
        </div>

        {statsCount > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: statsCount }).map((_, index) => (
              <Card
                key={index}
                className="rounded-2xl border-border/50 bg-card shadow-sm"
              >
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
          <CardHeader className="space-y-3 pb-4">
            <Skeleton className="h-6 w-40" />
            {toolbarVariant === "full" ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-full md:w-64" />
                <Skeleton className="h-10 w-[48%] md:w-40" />
                <Skeleton className="h-10 w-[48%] md:w-40" />
                <Skeleton className="h-10 w-full md:ml-auto md:w-28" />
              </div>
            ) : null}
            {toolbarVariant === "compact" ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-full md:w-72" />
                <Skeleton className="h-10 w-[48%] md:ml-auto md:w-32" />
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden overflow-hidden rounded-xl border border-border/50 md:block">
              <div
                className="grid gap-4 border-b border-border/50 bg-muted/40 px-4 py-3"
                style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: columnCount }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-20" />
                ))}
              </div>
              <div className="space-y-2 p-3">
                {Array.from({ length: rows }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-4 rounded-xl border border-border/40 bg-background/60 px-3 py-3"
                    style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: columnCount }).map((__, cell) => (
                      <Skeleton key={cell} className="h-4 w-full max-w-[120px]" />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border border-border/50 bg-background/70 p-4"
                >
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type DetailPageSkeletonProps = {
  sectionCount?: number;
  summaryCardCount?: number;
  actionButtonCount?: number;
  sectionDensity?: "default" | "dense";
  asideVariant?: "actions" | "summary" | "history" | "none";
  showAsideCard?: boolean;
  className?: string;
};

export function DetailPageSkeleton({
  sectionCount = 3,
  summaryCardCount = 3,
  actionButtonCount = 2,
  sectionDensity = "default",
  asideVariant = "actions",
  showAsideCard,
  className,
}: DetailPageSkeletonProps) {
  const resolvedAsideVariant =
    typeof showAsideCard === "boolean"
      ? showAsideCard
        ? asideVariant === "none"
          ? "actions"
          : asideVariant
        : "none"
      : asideVariant;

  const isDense = sectionDensity === "dense";

  return (
    <div className={cn("container py-8", className)}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64 rounded-xl" />
            <Skeleton className="h-4 w-52 rounded-lg" />
          </div>
          {actionButtonCount > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: actionButtonCount }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={cn("h-10", index === actionButtonCount - 1 ? "w-32" : "w-28")}
                />
              ))}
            </div>
          ) : null}
        </div>

        {summaryCardCount > 0 ? (
          <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
            <CardContent
              className={cn(
                "grid gap-4 p-5",
                summaryCardCount >= 4
                  ? "md:grid-cols-2 xl:grid-cols-4"
                  : "md:grid-cols-3",
              )}
            >
              {Array.from({ length: summaryCardCount }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border border-border/40 bg-background/60 p-4"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div
          className={cn(
            "grid gap-6",
            resolvedAsideVariant !== "none" && "xl:grid-cols-[minmax(0,1fr)_320px]",
          )}
        >
          <div className={cn(isDense ? "space-y-3" : "space-y-4")}>
            {Array.from({ length: sectionCount }).map((_, index) => (
              <Card key={index} className="rounded-2xl border-border/50 bg-card shadow-sm">
                <CardHeader className={cn("space-y-2", isDense ? "pb-2" : "pb-3")}>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                </CardHeader>
                <CardContent className={cn(isDense ? "space-y-2 pb-4" : "space-y-3 pb-5")}>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-4 w-[70%]" />
                  {isDense ? null : <Skeleton className="h-4 w-[55%]" />}
                </CardContent>
              </Card>
            ))}
          </div>

          {resolvedAsideVariant !== "none" ? (
            <Card className="h-fit rounded-2xl border-border/50 bg-card shadow-sm">
              <CardHeader className="space-y-2 pb-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-44" />
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {resolvedAsideVariant === "summary" ? (
                  <>
                    <div className="space-y-2 rounded-xl border border-border/40 bg-background/70 p-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/40 bg-background/70 p-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </>
                ) : null}

                {resolvedAsideVariant === "actions" ? (
                  <>
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </>
                ) : null}

                {resolvedAsideVariant === "history" ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-border/40 bg-background/70 p-3"
                      >
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-2 h-3 w-[85%]" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type FormPageSkeletonProps = {
  fields?: number;
  className?: string;
};

export function FormPageSkeleton({ fields = 6, className }: FormPageSkeletonProps) {
  return (
    <div className={cn("container py-8", className)}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 rounded-xl" />
          <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
        </div>

        <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
          <CardContent className="space-y-5 p-6">
            {Array.from({ length: fields }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

type CardListPageSkeletonProps = {
  cardCount?: number;
  columns?: 1 | 2 | 3;
  showToolbar?: boolean;
  className?: string;
};

export function CardListPageSkeleton({
  cardCount = 6,
  columns = 1,
  showToolbar = true,
  className,
}: CardListPageSkeletonProps) {
  const gridColumnsClassName =
    columns === 3
      ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
      : columns === 2
        ? "grid-cols-1 lg:grid-cols-2"
        : "grid-cols-1";

  return (
    <div className={cn("container py-10", className)}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>

        <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
          {showToolbar ? (
            <CardHeader className="space-y-3 pb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Skeleton className="h-10 w-full md:w-80" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            </CardHeader>
          ) : null}

          <CardContent className={cn("grid gap-3", gridColumnsClassName)}>
            {Array.from({ length: cardCount }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-border/50 bg-background/70 p-4"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-52 max-w-full" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <div className="mt-3 flex justify-end">
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type StackedCardListSkeletonProps = {
  count?: number;
  className?: string;
  cardClassName?: string;
  cardContentClassName?: string;
  titleLineWidthClassName?: string;
  subtitleLineWidthClassName?: string;
  badgeWidthClassName?: string;
  metaLayout?: "stacked" | "twoColumn";
  metaLineWidths?: string[];
  actionCount?: number;
  actionWidths?: string[];
};

export function StackedCardListSkeleton({
  count = 3,
  className,
  cardClassName = "border-0 bg-card",
  cardContentClassName = "space-y-4 p-6",
  titleLineWidthClassName = "w-24",
  subtitleLineWidthClassName = "w-48",
  badgeWidthClassName = "w-20",
  metaLayout = "stacked",
  metaLineWidths = ["w-full", "w-3/4"],
  actionCount = 1,
  actionWidths,
}: StackedCardListSkeletonProps) {
  const resolvedActionWidths =
    actionWidths && actionWidths.length > 0
      ? actionWidths
      : Array.from({ length: actionCount }).map(() => "w-24");

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className={cardClassName}>
          <CardContent className={cardContentClassName}>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className={cn("h-4", titleLineWidthClassName)} />
                <Skeleton className={cn("h-5", subtitleLineWidthClassName)} />
              </div>
              <Skeleton className={cn("h-7 rounded-full", badgeWidthClassName)} />
            </div>

            <div
              className={cn(
                "gap-2",
                metaLayout === "twoColumn"
                  ? "grid grid-cols-1 bp-sm:grid-cols-2"
                  : "space-y-2",
              )}
            >
              {metaLineWidths.map((widthClassName, metaIndex) => (
                <Skeleton
                  key={`${index}-meta-${metaIndex}`}
                  className={cn("h-4", widthClassName)}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2">
              {Array.from({ length: actionCount }).map((__, actionIndex) => (
                <Skeleton
                  key={`${index}-action-${actionIndex}`}
                  className={cn("h-9", resolvedActionWidths[actionIndex] ?? "w-24")}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type PreviewSplitFormSkeletonProps = {
  fields?: number;
  previewHeightClassName?: string;
  className?: string;
};

export function PreviewSplitFormSkeleton({
  fields = 5,
  previewHeightClassName = "h-56",
  className,
}: PreviewSplitFormSkeletonProps) {
  return (
    <div className={cn("container py-10", className)}>
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
          <CardHeader className="space-y-2">
            <Skeleton className="h-8 w-56 rounded-xl" />
            <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <Skeleton
                className={cn(
                  "w-full rounded-xl border border-border/40 bg-muted/40",
                  previewHeightClassName,
                )}
              />
              <div className="space-y-3">
                {Array.from({ length: fields }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type SuccessPageSkeletonProps = {
  summaryRows?: number;
  ctaCount?: number;
  className?: string;
};

export function SuccessPageSkeleton({
  summaryRows = 3,
  ctaCount = 2,
  className,
}: SuccessPageSkeletonProps) {
  return (
    <div className={cn("min-h-[70svh] bg-muted/20 py-8", className)}>
      <SiteContainer variant="wide" className="max-w-4xl space-y-6">
        <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
          <CardContent className="space-y-4 p-6 text-center">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-8 w-64 max-w-full" />
            <div className="space-y-2">
              <Skeleton className="mx-auto h-4 w-[90%]" />
              <Skeleton className="mx-auto h-4 w-[70%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: summaryRows }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-border/40 bg-background/70 p-4"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-5 w-[70%]" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          {Array.from({ length: ctaCount }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-36" />
          ))}
        </div>
      </SiteContainer>
    </div>
  );
}

type TabPanelSkeletonProps = {
  rowCount?: number;
  className?: string;
};

export function TabPanelSkeleton({ rowCount = 4, className }: TabPanelSkeletonProps) {
  return (
    <Card className={cn("rounded-2xl border-border/50 bg-card shadow-sm", className)}>
      <CardHeader className="space-y-2 bg-muted/40 pb-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {Array.from({ length: rowCount }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/40 bg-background/70 p-4"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-4 w-[80%]" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
