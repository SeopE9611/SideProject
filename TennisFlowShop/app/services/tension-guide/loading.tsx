import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { Skeleton } from "@/components/ui/skeleton";

export default function TensionGuideLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      <section className="border-b border-border bg-muted/30">
        <SiteContainer className="grid gap-8 py-10 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center bp-lg:py-14">
          <div className="space-y-6">
            <Skeleton className="h-7 w-32 rounded-full" />
            <div className="max-w-3xl space-y-4">
              <Skeleton className="h-10 w-full max-w-2xl" />
              <Skeleton className="h-10 w-4/5 max-w-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-full max-w-2xl" />
                <Skeleton className="h-5 w-3/4 max-w-xl" />
              </div>
            </div>
            <div className="flex flex-col gap-3 bp-sm:flex-row">
              <Skeleton className="h-11 w-full bp-sm:w-40" />
              <Skeleton className="h-11 w-full bp-sm:w-36" />
            </div>
          </div>
          <PublicSurface variant="feature" className="space-y-4">
            <Skeleton className="h-4 w-20" />
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </PublicSurface>
        </SiteContainer>
      </section>

      <SiteContainer className="space-y-8 py-6 bp-md:py-10 bp-lg:pb-16">
        <div className="grid grid-cols-2 gap-1 rounded-control bg-muted p-1 bp-sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-10 rounded-lg" />
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>

        <PublicSurface variant="feature" padding="none" className="overflow-hidden">
          <div className="grid bp-lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
            <div className="space-y-6 p-4 bp-sm:p-6 bp-lg:p-8">
              <Skeleton className="h-7 w-48" />
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 rounded-xl" />)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}
              </div>
            </div>
            <div className="space-y-6 bg-surface-inverse p-4 bp-sm:p-6 bp-lg:p-8">
              <Skeleton className="h-4 w-24 bg-surface-inverse-foreground/15" />
              <Skeleton className="h-14 w-32 bg-surface-inverse-foreground/15" />
              <Skeleton className="h-3 w-full rounded-full bg-surface-inverse-foreground/15" />
              <div className="grid gap-3 border-y border-surface-inverse-foreground/15 py-4 bp-sm:grid-cols-2">
                <Skeleton className="h-14 bg-surface-inverse-foreground/15" />
                <Skeleton className="h-14 bg-surface-inverse-foreground/15" />
              </div>
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-5 bg-surface-inverse-foreground/15" />)}
              </div>
            </div>
          </div>
        </PublicSurface>

        <PublicSurface className="space-y-4">
          <Skeleton className="h-7 w-40" />
          <div className="grid gap-4 bp-sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </PublicSurface>

        <PublicSurface padding="none" className="overflow-hidden">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="border-t border-border p-4 first:border-t-0 bp-md:p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-3 h-4 w-full max-w-xl" />
              <Skeleton className="mt-4 h-2 w-full rounded-full" />
            </div>
          ))}
        </PublicSurface>

        <PublicSurface className="flex flex-col gap-5 bg-muted/30 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full max-w-sm" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
          <div className="flex w-full flex-col gap-3 bp-sm:flex-row bp-lg:w-auto">
            <Skeleton className="h-11 w-full bp-sm:w-40" />
            <Skeleton className="h-11 w-full bp-sm:w-44" />
          </div>
        </PublicSurface>
      </SiteContainer>
    </div>
  );
}
