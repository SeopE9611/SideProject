import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border/60 bg-background">
        <SiteContainer
          variant="wide"
          className="space-y-3 py-4 bp-sm:space-y-4 bp-sm:py-5 bp-lg:py-6"
        >
          <div className="grid gap-5 rounded-hero border border-surface-inverse-foreground/15 bg-surface-inverse p-5 bp-md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] bp-md:items-center bp-lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] bp-lg:p-8">
            <Skeleton className="h-40 rounded-panel bg-surface-inverse-muted/20" />
            <Skeleton className="h-48 rounded-panel bg-surface-inverse-muted/20" />
          </div>
          <div className="grid gap-3 bp-lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
            <Skeleton className="h-24 rounded-panel" />
            <Skeleton className="h-32 rounded-panel" />
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-4 bp-sm:py-5 bp-lg:py-8">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <Skeleton className="hidden h-96 rounded-panel bp-lg:block" />
          <div className="min-w-0 bp-lg:col-span-3">
            <div className="mb-3 grid grid-cols-12 gap-1 rounded-panel border border-border/80 bg-card p-2 bp-sm:mb-4 bp-sm:grid-cols-7 bp-lg:hidden">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={`h-11 rounded-control ${index >= 4 ? "col-span-4 bp-sm:col-span-1" : "col-span-3 bp-sm:col-span-1"}`}
                />
              ))}
            </div>
            <div className="overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft">
              <div className="border-b border-border bg-muted/30 p-4 bp-sm:p-5 bp-lg:p-6">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-control" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32 rounded-control" />
                    <Skeleton className="h-4 w-56 max-w-full rounded-control" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-3 bp-sm:p-5 bp-lg:p-6">
                <div className="grid grid-cols-5 gap-1 rounded-control border border-border bg-card p-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-11 rounded-control" />
                  ))}
                </div>
                <Skeleton className="h-36 rounded-control" />
                <Skeleton className="h-36 rounded-control" />
                <Skeleton className="h-36 rounded-control" />
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
