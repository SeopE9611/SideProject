import { Skeleton } from "@/components/ui/skeleton";

export default function StringServiceApplyLoading() {
  return (
    <div className="min-h-full bg-card bp-lg:bg-background">
      <div className="border-b border-border bg-background/70 py-5 bp-sm:py-6 bp-lg:py-8">
        <div className="mx-auto w-full max-w-[1400px] px-3 bp-sm:px-4 bp-md:px-6">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="mt-4 h-9 w-64 max-w-full" />
          <Skeleton className="mt-3 h-5 w-full max-w-xl" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-3 pb-28 pt-6 bp-sm:px-4 bp-sm:pb-32 bp-md:px-6 bp-lg:pb-8">
        <div className="mb-5 rounded-panel border border-border bg-card p-4 shadow-soft bp-md:hidden">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-2 h-6 w-44" />
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
        </div>
        <div className="mb-6 hidden grid-cols-4 gap-4 bp-md:grid bp-lg:mx-auto bp-lg:max-w-[840px]">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="grid items-start gap-5 bp-lg:grid-cols-[minmax(0,1fr)_320px] bp-xl:grid-cols-[minmax(0,820px)_340px] bp-xl:justify-center">
          <div className="rounded-panel border border-border bg-card p-4 shadow-soft bp-sm:p-5 bp-lg:p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
            <div className="mt-6 grid gap-4 bp-md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-panel border border-border bg-card p-4 bp-lg:hidden">
              <Skeleton className="h-5 w-64 max-w-full" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
            <div className="sticky bottom-0 -mx-4 mt-8 border-t border-border bg-card/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 bp-sm:-mx-5 bp-sm:px-5 bp-lg:static bp-lg:mx-0 bp-lg:bg-transparent bp-lg:p-0 bp-lg:pt-5">
              <div className="grid grid-cols-2 gap-2 bp-lg:flex bp-lg:justify-end">
                <Skeleton className="h-10 w-full bp-lg:w-28" />
                <Skeleton className="h-10 w-full bp-lg:w-28" />
              </div>
            </div>
          </div>
          <div className="hidden rounded-panel border border-border bg-card p-4 shadow-soft bp-lg:block">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-24 w-full" />
            <Skeleton className="mt-4 h-16 w-full bg-surface-inverse/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
