import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";

const itemRows = ["cart-row-primary", "cart-row-secondary"];

export default function Loading() {
  return (
    <div className="min-h-full bg-background" aria-hidden="true">
      <div className="border-b border-border bg-muted/25">
        <SiteContainer className="max-w-[1240px] py-5 bp-sm:py-6">
          <div className="flex flex-col gap-4 bp-md:flex-row bp-md:items-end bp-md:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-12 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-4 w-[min(520px,76vw)] rounded-md" />
            </div>
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>
        </SiteContainer>
      </div>

      <SiteContainer className="max-w-[1240px] pb-[calc(96px+env(safe-area-inset-bottom))] pt-4 bp-sm:pt-5 bp-lg:pb-12">
        <div className="grid grid-cols-1 gap-5 bp-lg:grid-cols-[minmax(0,1fr)_360px] bp-xl:grid-cols-[minmax(0,1fr)_380px] bp-xl:gap-6">
          <PublicSurface variant="feature" padding="none" className="overflow-hidden">
            <div className="border-b border-border px-4 py-4 bp-sm:px-5">
              <Skeleton className="h-6 w-32 rounded-md" />
            </div>
            <div className="flex h-12 items-center justify-between border-b border-border px-4 bp-sm:px-5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-control" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <Skeleton className="h-8 w-20 rounded-control" />
            </div>

            <div className="divide-y divide-border">
              {itemRows.map((key) => (
                <div key={key} className="px-4 py-4 bp-sm:px-5">
                  <div className="grid min-w-0 grid-cols-[32px_minmax(72px,88px)_minmax(0,1fr)] items-start gap-3 bp-md:grid-cols-[32px_96px_minmax(0,1fr)]">
                    <Skeleton className="h-5 w-5 rounded-control" />
                    <Skeleton className="h-[88px] w-[88px] rounded-control bp-md:h-24 bp-md:w-24" />
                    <div className="min-w-0 space-y-3">
                      <Skeleton className="h-5 w-4/5 rounded-md" />
                      <Skeleton className="h-4 w-36 rounded-md" />
                      <div className="rounded-panel border border-border bg-muted/25 p-3">
                        <div className="grid gap-3 bp-md:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-52 max-w-full rounded-md" />
                            <Skeleton className="h-8 w-36 rounded-full" />
                          </div>
                          <div className="space-y-2 bp-md:text-right">
                            <Skeleton className="h-3 w-12 rounded-md bp-md:ml-auto" />
                            <Skeleton className="h-6 w-28 rounded-md bp-md:ml-auto" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PublicSurface>

          <div className="hidden min-w-0 bp-lg:block">
            <div className="sticky top-[calc(var(--header-h)+16px)] overflow-hidden rounded-panel border border-border bg-card shadow-soft">
              <div className="space-y-2 border-b border-border px-5 py-4">
                <Skeleton className="h-6 w-28 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <div className="space-y-4 px-5 py-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-4/5 rounded-md" />
                  <Skeleton className="h-7 w-full rounded-md" />
                </div>
                <div className="rounded-panel bg-surface-inverse p-4">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="mt-3 h-8 w-36 rounded-md" />
                  <Skeleton className="mt-4 h-12 w-full rounded-control" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
