import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { Skeleton } from "@/components/ui/skeleton";

export default function LocationsLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden>
      <header className="border-b border-border bg-muted/30 py-7 bp-sm:py-9">
        <SiteContainer>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center">
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full max-w-2xl" />
              <Skeleton className="h-10 w-4/5 max-w-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-full max-w-2xl" />
                <Skeleton className="h-5 w-3/4 max-w-xl" />
              </div>
              <div className="grid gap-2 bp-sm:flex">
                <Skeleton className="h-11 w-full bp-sm:w-48" />
                <Skeleton className="h-11 w-full bp-sm:w-32" />
              </div>
            </div>

            <PublicSurface variant="inverse" className="space-y-3">
              <div className="flex items-start gap-3 border-b border-surface-inverse-foreground/15 pb-3">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full bg-surface-inverse-foreground/15" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-32 bg-surface-inverse-foreground/15" />
                  <Skeleton className="h-4 w-full bg-surface-inverse-foreground/15" />
                  <Skeleton className="h-4 w-36 bg-surface-inverse-foreground/15" />
                </div>
              </div>
              {["weekday", "saturday", "holiday"].map((item) => (
                <div key={item} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-16 bg-surface-inverse-foreground/15" />
                  <Skeleton className="h-4 w-28 bg-surface-inverse-foreground/15" />
                </div>
              ))}
            </PublicSurface>
          </div>
        </SiteContainer>
      </header>

      <main>
        <section className="py-8 bp-sm:py-10 bp-lg:py-12">
          <SiteContainer variant="wide" className="space-y-5 bp-sm:space-y-7">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-full max-w-sm" />
              <Skeleton className="h-5 w-full max-w-xl" />
            </div>

            <PublicSurface padding="none" className="overflow-hidden">
              <div className="grid bp-lg:grid-cols-[minmax(0,1fr)_1.1fr]">
                <div className="space-y-5 bg-muted/30 p-5 bp-sm:p-6 bp-lg:p-8">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-44" />
                    </div>
                  </div>
                  <div className="space-y-3 border-t border-border pt-5">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-full max-w-md" />
                  </div>
                </div>

                <div className="space-y-6 p-5 bp-sm:p-6 bp-lg:p-8">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-5 w-full max-w-md" />
                  </div>

                  <div className="grid gap-3">
                    {["phone", "email"].map((item) => (
                      <div key={item} className="grid gap-1 bp-sm:grid-cols-[5rem_minmax(0,1fr)] bp-sm:gap-4">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-full max-w-xs" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Skeleton className="h-5 w-24" />
                    {["weekday", "saturday", "holiday"].map((item) => (
                      <div key={item} className="flex items-center justify-between gap-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <div className="flex flex-wrap gap-2">
                      {["service-a", "service-b", "service-c", "service-d"].map((item) => (
                        <Skeleton key={item} className="h-7 w-24 rounded-full" />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 border-t border-border bg-muted/30 px-4 py-4 bp-sm:flex bp-sm:flex-wrap bp-sm:items-center bp-sm:justify-between">
                    <Skeleton className="h-5 w-full max-w-sm" />
                    <div className="grid gap-2 bp-sm:flex">
                      <Skeleton className="h-11 w-full bp-sm:w-48" />
                      <Skeleton className="h-11 w-full bp-sm:w-32" />
                    </div>
                  </div>
                </div>
              </div>
            </PublicSurface>
          </SiteContainer>
        </section>

        <section className="pb-10 bp-sm:pb-12 bp-lg:pb-16">
          <SiteContainer>
            <PublicSurface variant="inverse" className="space-y-5">
              <div className="space-y-2">
                <Skeleton className="h-8 w-full max-w-lg bg-surface-inverse-foreground/15" />
                <Skeleton className="h-5 w-full max-w-xl bg-surface-inverse-foreground/15" />
              </div>
              <div className="grid gap-2 bp-sm:flex">
                <Skeleton className="h-11 w-full bg-surface-inverse-foreground/15 bp-sm:w-44" />
                <Skeleton className="h-11 w-full bg-surface-inverse-foreground/15 bp-sm:w-44" />
              </div>
            </PublicSurface>
          </SiteContainer>
        </section>
      </main>
    </div>
  );
}
