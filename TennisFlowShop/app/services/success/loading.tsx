import SiteContainer from "@/components/layout/SiteContainer";
import { SummaryCard } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";

const progressItems = ["status", "todo", "next"] as const;
const guideRows = ["notice-1", "notice-2", "notice-3"] as const;
const featureRows = ["feature-1", "feature-2", "feature-3"] as const;

function CompactRows({ count = 2 }: { count?: 2 | 3 }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, index) => `compact-row-${index + 1}`).map((key) => (
        <div
          key={key}
          className="flex items-center rounded-control border border-border/70 bg-muted/20 p-4"
        >
          <Skeleton className="mr-3 h-5 w-5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full max-w-[220px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummarySurface({ className }: { className?: string }) {
  return (
    <div className={`rounded-control border border-border/70 bg-muted/20 p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-center">
        <Skeleton className="mr-3 h-6 w-6 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-6 w-28" />
    </div>
  );
}

export default function StringServiceSuccessLoading() {
  return (
    <div className="min-h-full bg-background text-foreground" aria-hidden="true">
      <div className="bg-background py-8 md:py-12">
        <SiteContainer>
          <div className="flex flex-col items-center py-8 text-center sm:py-10">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="mt-5 h-8 w-full max-w-[280px]" />
            <div className="mt-3 flex w-full flex-col items-center gap-2">
              <Skeleton className="h-4 w-full max-w-[360px]" />
              <Skeleton className="h-4 w-full max-w-[260px]" />
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-control border border-border/70 bg-muted/20 px-3 py-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer className="py-8 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <SummaryCard
              variant="feature"
              className="overflow-hidden"
              contentClassName="p-0"
              footer={
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              }
            >
              <div className="border-b border-border/80 bg-muted/20 p-4 sm:p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <Skeleton className="mr-3 h-6 w-6 shrink-0 rounded-full" />
                      <Skeleton className="h-6 w-28 max-w-full" />
                    </div>
                    <Skeleton className="mt-2 h-4 w-full max-w-[360px]" />
                  </div>
                  <Skeleton className="h-9 w-24 shrink-0" />
                </div>
              </div>

              <div className="p-4 sm:p-5 md:p-6">
                <div className="mb-6 rounded-control border border-border/70 bg-muted/20 p-4 md:p-5">
                  <Skeleton className="h-5 w-40" />
                  <div className="mt-3 grid gap-0 divide-y divide-border/70 md:grid-cols-3 md:divide-x md:divide-y-0">
                    {progressItems.map((item) => (
                      <div key={item} className="p-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="mt-2 h-4 w-full" />
                        <Skeleton className="mt-2 h-4 w-4/5" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mb-8 lg:grid-cols-4">
                  <SummarySurface />
                  <div className="rounded-control border border-border/70 bg-muted/20 p-4 lg:col-span-2">
                    <div className="mb-3 flex items-center">
                      <Skeleton className="mr-3 h-6 w-6 shrink-0 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="rounded-control bg-surface-inverse px-3 py-2 text-surface-inverse-foreground">
                      <Skeleton className="h-7 w-36 bg-brand-highlight" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                  <SummarySurface />
                  <SummarySurface />
                  <SummarySurface />
                  <SummarySurface className="lg:col-span-2" />
                </div>

                <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center">
                      <Skeleton className="mr-3 h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-28" />
                    </div>
                    <CompactRows count={3} />
                  </div>
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center">
                      <Skeleton className="mr-3 h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                    <CompactRows count={2} />
                  </div>
                </div>

                <div className="my-6 h-px bg-border md:my-8" />

                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center">
                    <Skeleton className="mr-3 h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="rounded-control border border-border/70 bg-muted/20 p-4 md:p-5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-4/5" />
                  </div>
                </div>
              </div>
            </SummaryCard>
          </div>

          <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
            <SummaryCard variant="feature" title={<Skeleton className="h-6 w-32" />}>
              <div className="space-y-3">
                {guideRows.map((row) => (
                  <div key={row} className="flex items-start">
                    <Skeleton className="mr-3 mt-0.5 h-5 w-5 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </SummaryCard>

            <SummaryCard variant="feature" title={<Skeleton className="h-6 w-28" />}>
              <div className="space-y-4">
                {featureRows.map((row) => (
                  <div
                    key={row}
                    className="flex items-center rounded-control border border-border/70 bg-muted/20 p-3"
                  >
                    <Skeleton className="mr-3 h-6 w-6 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full max-w-[220px]" />
                    </div>
                  </div>
                ))}
              </div>
            </SummaryCard>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
