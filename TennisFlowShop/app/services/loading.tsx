import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="flex flex-col bg-background" aria-hidden>
      <header className="border-b border-border bg-muted/30 py-7 bp-sm:py-9">
        <SiteContainer>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center">
            <div className="max-w-3xl space-y-4">
              <Skeleton className="h-4 w-full max-w-36 rounded-control" />
              <Skeleton className="h-10 w-full max-w-3xl rounded-control bp-sm:h-12" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-full max-w-2xl rounded-control" />
                <Skeleton className="h-5 w-4/5 max-w-xl rounded-control" />
              </div>
              <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                <Skeleton className="h-10 w-full rounded-control bp-sm:w-40" />
                <Skeleton className="h-10 w-full rounded-control bp-sm:w-40" />
              </div>
            </div>

            <PublicSurface variant="inverse" className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 border-b border-surface-inverse-foreground/15 pb-3 last:border-b-0 last:pb-0"
                >
                  <Skeleton className="h-5 w-full max-w-24 rounded-control bg-surface-inverse-foreground/15" />
                  <div className="flex min-w-0 flex-1 justify-end">
                    <Skeleton className="h-5 w-3/4 max-w-32 rounded-control bg-surface-inverse-foreground/15" />
                  </div>
                </div>
              ))}
            </PublicSurface>
          </div>
        </SiteContainer>
      </header>

      <section
        className="scroll-mt-[calc(var(--header-h)+1rem)] py-8 bp-sm:py-10 bp-lg:py-12"
        id="service-start"
      >
        <SiteContainer>
          <div className="mb-5 space-y-2 bp-sm:mb-7">
            <Skeleton className="h-8 w-full max-w-sm rounded-control" />
            <Skeleton className="h-5 w-full max-w-2xl rounded-control" />
          </div>
          <div className="grid gap-4 bp-sm:grid-cols-2 bp-lg:grid-cols-12">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`flex h-full min-w-0 flex-col rounded-panel border border-border/80 p-5 ${index === 0 ? "bg-muted/40 bp-sm:col-span-2 bp-lg:col-span-6" : "bg-card bp-lg:col-span-3"}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-control bg-muted/40" />
                  <Skeleton className="h-6 w-full max-w-20 rounded-control" />
                </div>
                <Skeleton className="h-6 w-full max-w-sm rounded-control" />
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-4 w-full rounded-control" />
                  <Skeleton className="h-4 w-4/5 rounded-control" />
                </div>
                <div className="my-4 border-t border-border/80 pt-3">
                  <Skeleton className="h-4 w-full max-w-md rounded-control" />
                </div>
                <Skeleton className="mt-auto h-5 w-full max-w-44 rounded-control" />
              </div>
            ))}
          </div>
        </SiteContainer>
      </section>

      <section className="py-8 bp-sm:py-10 bp-lg:py-12">
        <SiteContainer>
          <div className="mb-5 space-y-2 bp-sm:mb-7">
            <Skeleton className="h-8 w-full max-w-md rounded-control" />
            <Skeleton className="h-5 w-full max-w-2xl rounded-control" />
          </div>
          <PublicSurface padding="none" className="overflow-hidden">
            <div className="grid bp-sm:grid-cols-2 bp-lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-w-0 items-start gap-3 border-b border-border p-4 bp-sm:border-r bp-lg:[&:nth-child(3n)]:border-r-0 bp-sm:[&:nth-last-child(-n+2)]:border-b-0 bp-lg:[&:nth-last-child(-n+3)]:border-b-0"
                >
                  <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-control" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-full max-w-32 rounded-control" />
                    <Skeleton className="h-4 w-full rounded-control" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-border bg-muted/30 p-4 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
              <Skeleton className="h-5 w-full max-w-32 rounded-control" />
              <Skeleton className="h-5 w-full max-w-md rounded-control" />
            </div>
          </PublicSurface>
        </SiteContainer>
      </section>

      <section
        className="scroll-mt-[calc(var(--header-h)+1rem)] bg-muted/30 py-8 bp-sm:py-10 bp-lg:py-12"
        id="pricing"
      >
        <SiteContainer>
          <div className="grid gap-6 bp-lg:grid-cols-[0.9fr_1.1fr] bp-lg:items-start">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full max-w-24 rounded-control" />
              <Skeleton className="h-8 w-full max-w-sm rounded-control" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-full max-w-lg rounded-control" />
                <Skeleton className="h-5 w-full max-w-md rounded-control" />
                <Skeleton className="h-5 w-full max-w-md rounded-control" />
              </div>
              <Skeleton className="h-10 w-full rounded-control bp-sm:w-44" />
              <div className="border-t border-border pt-3">
                <Skeleton className="h-5 w-full max-w-lg rounded-control" />
              </div>
            </div>
            <PublicSurface padding="none" className="overflow-hidden">
              <div className="hidden grid-cols-[1.1fr_0.7fr_1fr_1fr] border-b border-border bg-muted/40 px-4 py-3 bp-sm:grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full max-w-20 rounded-control" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 bp-sm:grid-cols-[1.1fr_0.7fr_1fr_1fr]"
                >
                  <Skeleton className="h-5 w-full max-w-28 rounded-control" />
                  <Skeleton className="h-5 w-full max-w-16 rounded-control" />
                  <Skeleton className="h-5 w-full max-w-24 rounded-control" />
                  <Skeleton className="h-5 w-full max-w-24 rounded-control" />
                </div>
              ))}
              <div className="grid gap-2 px-4 py-3 bp-sm:grid-cols-[1.1fr_2.7fr]">
                <Skeleton className="h-5 w-full max-w-32 rounded-control" />
                <Skeleton className="h-5 w-full max-w-sm rounded-control" />
              </div>
            </PublicSurface>
          </div>
        </SiteContainer>
      </section>

      <section className="py-8 bp-sm:py-10 bp-lg:py-12">
        <SiteContainer>
          <PublicSurface variant="inverse" className="space-y-5">
            <div className="max-w-2xl space-y-2">
              <Skeleton className="h-4 w-full max-w-32 rounded-control bg-surface-inverse-foreground/15" />
              <Skeleton className="h-8 w-full max-w-64 rounded-control bg-surface-inverse-foreground/15" />
            </div>
            <ol className="grid gap-0 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <li
                  key={index}
                  className="border-t border-surface-inverse-foreground/15 py-4 bp-sm:px-4 bp-sm:[&:nth-child(2n)]:border-l bp-lg:border-l bp-lg:first:border-l-0"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full bg-surface-inverse-foreground/15" />
                    <Skeleton className="h-6 w-6 rounded-control bg-surface-inverse-foreground/15" />
                  </div>
                  <Skeleton className="h-5 w-full max-w-32 rounded-control bg-surface-inverse-foreground/15" />
                  <Skeleton className="mt-2 h-4 w-full max-w-48 rounded-control bg-surface-inverse-foreground/15" />
                </li>
              ))}
            </ol>
          </PublicSurface>
        </SiteContainer>
      </section>

      <section className="pb-10 pt-2 bp-sm:pb-12 bp-lg:pb-16">
        <SiteContainer>
          <PublicSurface className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-full max-w-sm rounded-control" />
              <Skeleton className="h-5 w-full max-w-xl rounded-control" />
            </div>
            <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
              <Skeleton className="h-10 w-full rounded-control bp-sm:w-40" />
              <Skeleton className="h-10 w-full rounded-control bp-sm:w-36" />
            </div>
          </PublicSurface>
        </SiteContainer>
      </section>
    </div>
  );
}
