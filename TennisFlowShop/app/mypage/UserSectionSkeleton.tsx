import { Skeleton } from "@/components/ui/skeleton";

export default function UserSectionSkeleton() {
  return (
    <div className="rounded-hero border border-surface-inverse-foreground/15 bg-surface-inverse p-5 shadow-soft bp-sm:p-6 bp-lg:p-8">
      <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] bp-lg:items-end">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-28 rounded-control bg-surface-inverse-muted/30" />
            <Skeleton className="h-6 w-20 rounded-control bg-surface-inverse-muted/30" />
          </div>
          <Skeleton className="h-8 w-full max-w-lg rounded-control bg-surface-inverse-muted/30 bp-sm:h-10" />
          <Skeleton className="h-4 w-full max-w-sm rounded-control bg-surface-inverse-muted/30" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24 rounded-control bg-surface-inverse-muted/30" />
            <Skeleton className="h-6 w-20 rounded-control bg-surface-inverse-muted/30" />
          </div>
        </div>
        <div className="rounded-panel border border-surface-inverse-foreground/15 bg-surface-inverse-muted/10 p-4 bp-sm:p-5">
          <Skeleton className="h-4 w-28 rounded-control bg-surface-inverse-muted/30" />
          <Skeleton className="mt-3 h-12 w-20 rounded-control bg-surface-inverse-muted/30" />
          <div className="mt-4 grid gap-2 bp-sm:grid-cols-2 bp-lg:grid-cols-1">
            <Skeleton className="h-11 rounded-control bg-surface-inverse-muted/30" />
            <Skeleton className="h-11 rounded-control bg-surface-inverse-muted/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
