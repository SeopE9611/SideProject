import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogCardSkeleton } from "./CatalogCardSkeleton";

type CommerceCatalogPageSkeletonProps = {
  loadingLabel: string;
  actionCount?: 1 | 2 | 3;
  showDetailBlock?: boolean;
};

export function CommerceCatalogPageSkeleton({
  loadingLabel,
  actionCount = 2,
  showDetailBlock = false,
}: CommerceCatalogPageSkeletonProps) {
  return (
    <div className="min-h-full bg-background" aria-busy="true">
      <span className="sr-only">{loadingLabel}</span>

      <div className="pt-4 bp-sm:pt-6 bp-md:pt-8">
        <SiteContainer variant="wide" className="bp-lg:max-w-[1600px] bp-xl:max-w-[1680px]">
          <div className="grid gap-6 rounded-hero border border-border bg-card p-5 shadow-soft bp-sm:p-6 bp-lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] bp-lg:gap-8 bp-lg:p-8">
            <div className="flex flex-col justify-center space-y-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-12 w-3/4 max-w-md bp-sm:h-14" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-full max-w-xl" />
                <Skeleton className="h-5 w-4/5 max-w-lg" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl bp-sm:w-52" />
            </div>
            <div className="rounded-panel border border-border bg-muted/20 p-4 bp-sm:p-5">
              <Skeleton className="h-5 w-32" />
              <div className="mt-3 divide-y divide-border">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <Skeleton className="size-7 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer
        variant="wide"
        className="py-6 bp-sm:py-8 bp-md:py-12 bp-lg:max-w-[1600px] bp-xl:max-w-[1680px]"
      >
        <section className="overflow-hidden border-y border-border bg-card bp-md:rounded-panel bp-md:border-x bp-md:shadow-soft">
          <div className="space-y-3 p-4 bp-md:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="border-t border-border bg-muted/15 p-3 bp-md:p-4">
            <div className="grid grid-cols-2 gap-2 bp-md:flex bp-md:justify-between">
              <Skeleton className="h-11 w-full bp-md:w-28" />
              <Skeleton className="h-11 w-full bp-md:w-40" />
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 bp-sm:grid-cols-2 bp-md:gap-6 bp-lg:grid-cols-3 bp-2xl:grid-cols-4">
          <CatalogCardSkeleton
            viewMode="grid"
            count={12}
            actionCount={actionCount}
            showDetailBlock={showDetailBlock}
          />
        </div>
      </SiteContainer>
    </div>
  );
}
