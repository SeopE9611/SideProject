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
          className="flex items-center border-b border-border/70 py-4"
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
    <div className={`border-b border-border/70 py-4 ${className ?? ""}`}>
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
      <div className="bg-background py-8 bp-md:py-12">
        <SiteContainer>
          <div className="flex flex-col items-center py-8 text-center bp-sm:py-10">
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

      <SiteContainer className="py-8 bp-md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <SummaryCard
              variant="feature"
              className="overflow-hidden"
              contentClassName="p-0"
              footer={
                <div className="flex w-full flex-col gap-3 bp-sm:flex-row">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 flex-1" />
                </div>
              }
            >
              <div className="border-b border-border/80 bg-muted/20 p-4 bp-sm:p-5 bp-md:p-6">
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

              <div className="p-4 bp-sm:p-5 bp-md:p-6">
                <div className="mb-6 rounded-control border border-border/70 bg-muted/20 p-4 bp-md:p-5">
                  <Skeleton className="h-5 w-40" />
                  <div className="mt-3 grid gap-0 divide-y divide-border/70 bp-md:grid-cols-3 bp-md:divide-x bp-md:divide-y-0">
                    {progressItems.map((item) => (
                      <div key={item} className="p-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="mt-2 h-4 w-full" />
                        <Skeleton className="mt-2 h-4 w-4/5" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 bp-sm:flex-row">
                    <Skeleton className="h-11 flex-1" />
                    <Skeleton className="h-11 flex-1" />
                  </div>
                </div>
              </div>
            </SummaryCard>

            <div className="mt-8 space-y-8">
              <div className="grid grid-cols-1 divide-y divide-border/70 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
                <SummarySurface />
                <div className="border-b border-border/70 py-4 bp-lg:col-span-2">
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
                <SummarySurface className="bp-lg:col-span-2" />
              </div>

              <div className="grid grid-cols-1 gap-6 bp-md:gap-8 bp-lg:grid-cols-2">
                <div className="space-y-4 bp-md:space-y-6">
                  <div className="flex items-center">
                    <Skeleton className="mr-3 h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                  <CompactRows count={3} />
                </div>
                <div className="space-y-4 bp-md:space-y-6">
                  <div className="flex items-center">
                    <Skeleton className="mr-3 h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <CompactRows count={2} />
                </div>
              </div>

              <div className="space-y-4 bp-md:space-y-6">
                <div className="flex items-center">
                  <Skeleton className="mr-3 h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="border-b border-border/70 py-4 bp-md:py-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-4/5" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 bp-md:gap-8 bp-lg:grid-cols-2">
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
                    className="flex items-center py-3"
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
