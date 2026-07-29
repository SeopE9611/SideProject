import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-background py-6 bp-sm:py-8">
      <SiteContainer variant="wide" className="mx-auto max-w-4xl space-y-5">
        <div className="space-y-3 py-3 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto h-7 w-64 max-w-full" />
          <Skeleton className="mx-auto h-4 w-full max-w-xl" />
        </div>

        <div className="border-y border-border/70 py-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-5 w-56 max-w-full" />
        </div>

        <section className="space-y-4 bg-muted/20 p-4 bp-sm:p-5">
          <Skeleton className="h-5 w-44" />
          <div className="grid gap-4 bp-lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="space-y-2 border-b border-border/70 pb-4 last:border-0 last:pb-0 bp-lg:border-b-0 bp-lg:border-r bp-lg:pb-0 bp-lg:pr-4 bp-lg:last:border-r-0"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
          <div className="grid gap-3 bp-lg:grid-cols-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </section>

        <section className="space-y-4 border-t border-border/70 pt-5">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-20 shrink-0" />
            </div>
          ))}
        </section>

        <div className="grid gap-5 border-t border-border/70 pt-5 bp-lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <section key={index} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </section>
          ))}
        </div>

        <div className="space-y-3 border-t border-border/70 pt-5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>

        <div className="grid gap-3 pb-8 bp-sm:grid-cols-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </SiteContainer>
    </div>
  );
}
