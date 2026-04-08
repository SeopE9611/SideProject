import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FullPageSpinnerProps = {
  label?: string;
  className?: string;
  /** 기본값: 100svh (체크아웃/결제 같은 “막히는 화면”에 적합) */
  minHeightClassName?: string;
};

export function FullPageSpinner({
  label = "불러오는 중...",
  className,
  minHeightClassName = "min-h-[100svh]",
}: FullPageSpinnerProps) {
  return (
    <div
      className={cn("grid place-items-center", minHeightClassName, className)}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

type ListSkeletonProps = {
  className?: string;
  rows?: number;
  withHeader?: boolean;
};

export function ListPageSkeleton({
  className,
  rows = 8,
  withHeader = true,
}: ListSkeletonProps) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 py-10", className)}>
      {withHeader && (
        <div className="mb-8 space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-[520px] max-w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-background/60 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-[70%]" />
                <Skeleton className="h-4 w-[45%]" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type GridSkeletonProps = {
  className?: string;
  count?: number;
};

export function CardGridSkeleton({ className, count = 12 }: GridSkeletonProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-10", className)}>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
      </div>

      <div className="grid grid-cols-2 bp-sm:grid-cols-3 bp-md:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border/40 bg-background/60"
          >
            <Skeleton className="h-40 w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-[85%]" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
