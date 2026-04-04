import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TablePageSkeletonProps = {
  titleWidthClassName?: string;
  descriptionWidthClassName?: string;
  statsCount?: number;
  rows?: number;
  className?: string;
};

export function TablePageSkeleton({
  titleWidthClassName = "w-48",
  descriptionWidthClassName = "w-80",
  statsCount = 0,
  rows = 6,
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
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-full md:w-64" />
              <Skeleton className="h-10 w-[48%] md:w-40" />
              <Skeleton className="h-10 w-[48%] md:w-40" />
              <Skeleton className="h-10 w-full md:ml-auto md:w-28" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden overflow-hidden rounded-xl border border-border/50 md:block">
              <div className="grid grid-cols-7 gap-4 border-b border-border/50 bg-muted/40 px-4 py-3">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-20" />
                ))}
              </div>
              <div className="space-y-2 p-3">
                {Array.from({ length: rows }).map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-7 gap-4 rounded-xl border border-border/40 bg-background/60 px-3 py-3"
                  >
                    {Array.from({ length: 7 }).map((__, cell) => (
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
  showAsideCard?: boolean;
  className?: string;
};

export function DetailPageSkeleton({
  sectionCount = 3,
  showAsideCard = true,
  className,
}: DetailPageSkeletonProps) {
  return (
    <div className={cn("container py-8", className)}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64 rounded-xl" />
            <Skeleton className="h-4 w-52 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-border/40 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className={cn("grid gap-6", showAsideCard && "xl:grid-cols-[1fr_320px]")}>
          <div className="space-y-4">
            {Array.from({ length: sectionCount }).map((_, index) => (
              <Card key={index} className="rounded-2xl border-border/50 bg-card shadow-sm">
                <CardHeader className="space-y-2 pb-3">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                </CardHeader>
                <CardContent className="space-y-2 pb-5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </CardContent>
              </Card>
            ))}
          </div>

          {showAsideCard ? (
            <Card className="h-fit rounded-2xl border-border/50 bg-card shadow-sm">
              <CardHeader className="space-y-2 pb-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-44" />
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-10 w-full" />
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
