import SiteContainer from "@/components/layout/SiteContainer";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-muted/20">
      <div className="relative overflow-hidden border-b border-border bg-card py-10 bp-sm:py-12 bp-md:py-20">
        <div className="absolute inset-0 bg-overlay/10 dark:bg-overlay/30" />
        <SiteContainer variant="wide" className="relative">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <Skeleton className="mx-auto h-10 w-56 bp-sm:h-12 bp-sm:w-72 bp-md:h-14 bp-md:w-96" />
            <Skeleton className="mx-auto h-5 w-full max-w-2xl" />
            <Skeleton className="mx-auto h-5 w-4/5 max-w-xl" />
          </div>
        </SiteContainer>
      </div>

      <SiteContainer
        variant="wide"
        className="space-y-5 py-6 bp-sm:space-y-6 bp-sm:py-8 bp-md:py-12"
      >
        <Card className="rounded-2xl border-border/50 bg-card p-4 bp-sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-44 bp-sm:w-56" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="flex w-full gap-2 bp-sm:w-auto">
              <Skeleton className="h-9 flex-1 bp-sm:w-28" />
              <Skeleton className="h-9 flex-1 bp-sm:w-28" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card p-4 bp-sm:p-5">
          <div className="flex flex-wrap items-center gap-3 bp-sm:gap-4">
            <Skeleton className="h-9 w-full bp-sm:w-56" />
            <Skeleton className="h-9 w-[48%] bp-sm:w-40" />
            <Skeleton className="h-9 w-[48%] bp-sm:w-40" />
            <Skeleton className="h-4 w-20 bp-sm:ml-auto" />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 bp-sm:grid-cols-3 bp-md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card
              key={index}
              className="overflow-hidden rounded-xl border border-border/40 bg-background/60"
            >
              <Skeleton className="h-40 w-full" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-[85%]" />
                <Skeleton className="h-4 w-20" />
              </div>
            </Card>
          ))}
        </div>
      </SiteContainer>
    </div>
  );
}
