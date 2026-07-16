import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden>
      <header className="border-b border-border bg-muted/30 py-7 bp-sm:py-9">
        <SiteContainer>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center">
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full max-w-2xl" />
              <Skeleton className="h-5 w-full max-w-xl" />
              <div className="grid gap-2 bp-sm:flex">
                <Skeleton className="h-11 w-full bp-sm:w-40" />
                <Skeleton className="h-11 w-full bp-sm:w-40" />
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-5 bp-sm:p-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </SiteContainer>
      </header>

      <SiteContainer variant="wide" className="space-y-8 py-8 bp-md:space-y-12 bp-md:py-12">
        <section className="space-y-5">
          <Skeleton className="h-8 w-72 max-w-full" />
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid bp-md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-4 border-b border-border p-5 last:border-b-0 bp-md:border-b-0 bp-md:border-r bp-md:last:border-r-0 bp-md:p-6">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <Skeleton className="h-8 w-64 max-w-full" />
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="hidden border-b border-border bg-muted/30 p-4 bp-md:grid bp-md:grid-cols-4 bp-md:gap-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-4 w-24" />)}
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-4 border-b border-border p-5 last:border-b-0 bp-md:p-6">
                <div className="grid gap-4 bp-md:grid-cols-[1.4fr_0.8fr_1fr_1fr]">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-3 bp-md:grid-cols-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 bp-lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-4 rounded-2xl border border-border bg-card p-5 bp-sm:p-6">
              <Skeleton className="h-7 w-40" />
              <div className="grid gap-3 bp-sm:grid-cols-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </section>

        <section className="grid gap-4 bp-lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-4 rounded-2xl border border-border bg-card p-5 bp-sm:p-6">
              <Skeleton className="h-7 w-48" />
              <div className="grid gap-3 bp-sm:grid-cols-2">
                {Array.from({ length: 4 }).map((__, itemIndex) => <Skeleton key={itemIndex} className="h-16 w-full" />)}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-surface-inverse-foreground/15 bg-surface-inverse p-5 bp-sm:p-6">
          <Skeleton className="h-7 w-44" />
          <div className="mt-4 grid gap-3 bp-md:grid-cols-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-muted/30 p-5 bp-sm:p-6">
          <Skeleton className="mx-auto h-8 w-full max-w-sm" />
          <Skeleton className="mx-auto mt-3 h-5 w-full max-w-xl" />
          <div className="mt-4 grid gap-2 bp-sm:flex bp-sm:justify-center">
            <Skeleton className="h-11 w-full bp-sm:w-48" />
            <Skeleton className="h-11 w-full bp-sm:w-44" />
          </div>
        </section>
      </SiteContainer>
    </div>
  );
}
