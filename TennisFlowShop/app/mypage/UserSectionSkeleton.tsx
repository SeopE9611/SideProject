import { Skeleton } from "@/components/ui/skeleton";

export default function UserSectionSkeleton() {
  return (
    <div className="rounded-panel border border-border/80 bg-card p-4 shadow-soft bp-sm:p-5">
      <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-control" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-28 rounded-control" />
              <Skeleton className="h-6 w-20 rounded-control" />
              <Skeleton className="h-6 w-24 rounded-control" />
            </div>
            <Skeleton className="h-4 w-full max-w-sm rounded-control" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded-control bp-sm:w-28" />
      </div>
    </div>
  );
}
