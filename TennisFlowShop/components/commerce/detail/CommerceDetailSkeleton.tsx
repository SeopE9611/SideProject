import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { optionSectionCount?: number; actionCount?: 1 | 2 | 3; showThumbnails?: boolean };
export function CommerceDetailSkeleton({
  optionSectionCount = 3,
  actionCount = 2,
  showThumbnails = true,
}: Props) {
  return (
    <div className="min-h-full bg-background pb-24 bp-md:pb-10">
      <div className="border-b border-border/60 bg-card/70 py-4 bp-sm:py-5">
        <SiteContainer variant="wide">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-2/3 max-w-md" />
            <Skeleton className="h-11 w-24 bp-md:h-9" />
          </div>
        </SiteContainer>
      </div>
      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-10">
        <div className="grid grid-cols-1 gap-6 bp-md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] bp-lg:grid-cols-[minmax(0,1.25fr)_minmax(380px,440px)]">
          <div className="space-y-3">
            <Skeleton className="-mx-3 aspect-square rounded-none border-x-0 border-y border-border bp-sm:-mx-4 bp-md:mx-0 bp-md:rounded-panel bp-md:border-x" />
            {showThumbnails ? (
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-xl" />
                ))}
              </div>
            ) : null}
          </div>
          <div className="-mx-3 rounded-none border-x-0 border-y border-border bg-card p-4 shadow-none bp-sm:-mx-4 bp-sm:p-5 bp-md:mx-0 bp-md:rounded-panel bp-md:border-x bp-md:p-7 bp-md:shadow-sm">
            <div className="space-y-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-4/5" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-24 w-full rounded-xl" />
              {Array.from({ length: optionSectionCount }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
              {Array.from({ length: actionCount }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="-mx-3 mt-8 overflow-hidden rounded-none border-x-0 border-y border-border bg-card shadow-none bp-sm:-mx-4 bp-md:mx-0 bp-md:mt-10 bp-md:rounded-panel bp-md:border-x bp-md:shadow-sm">
          <Skeleton className="h-16 w-full rounded-t-panel" />
          <div className="p-4 bp-sm:p-6 bp-md:p-8">
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
