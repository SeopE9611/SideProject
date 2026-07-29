import SiteContainer from "@/components/layout/SiteContainer";
import StickyAside from "@/components/layout/StickyAside";
import { Skeleton } from "@/components/ui/skeleton";
import { StringSelectionCardSkeleton } from "./StringSelectionCardSkeleton";

type CommerceSelectionPageSkeletonProps = {
  flowType: "purchase" | "rental";
  showQuantityControls?: boolean;
};

type SummarySkeletonProps = {
  showQuantityControls?: boolean;
  showSecondaryAction?: boolean;
};

function SummarySkeleton({ showQuantityControls, showSecondaryAction }: SummarySkeletonProps) {
  return (
    <div
      className="-mx-3 border-y border-border px-3 py-4 bp-sm:-mx-4 bp-sm:px-4 bp-md:mx-0 bp-md:overflow-hidden bp-md:rounded-2xl bp-md:border bp-md:bg-card bp-md:p-0 bp-md:shadow-sm"
      aria-hidden="true"
    >
      <div className="border-b border-border pb-3 bp-md:bg-secondary/30 bp-md:px-5 bp-md:py-4">
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="pt-4 bp-md:p-5">
        <div className="flex gap-3">
          <Skeleton className="h-16 w-16 rounded-xl bp-md:h-20 bp-md:w-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        {showQuantityControls ? <Skeleton className="mt-5 h-24 w-full rounded-xl" /> : null}
        {showSecondaryAction ? (
          <Skeleton className="mt-4 h-11 w-full rounded-xl bp-md:h-10" />
        ) : null}
        <Skeleton className="mt-4 h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function CommerceSelectionPageSkeleton({
  flowType,
  showQuantityControls,
}: CommerceSelectionPageSkeletonProps) {
  const isRental = flowType === "rental";
  return (
    <div className="min-h-screen bg-background">
      <p className="sr-only" role="status" aria-live="polite">
        {isRental
          ? "대여 스트링 선택 화면을 불러오는 중입니다."
          : "구매 스트링 선택 화면을 불러오는 중입니다."}
      </p>
      <SiteContainer variant="wide" className="space-y-6 py-5 bp-md:py-8">
        <section
          className="-mx-3 border-b border-border px-3 pb-5 bp-sm:-mx-4 bp-sm:px-4 bp-md:mx-0 bp-md:rounded-panel bp-md:border bp-md:bg-card bp-md:p-5 bp-md:shadow-sm"
          aria-hidden="true"
        >
          <Skeleton className="h-5 w-24" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-8 w-2/3" />
          <Skeleton className="mt-2 h-5 w-full max-w-2xl" />
        </section>
        <div className="grid gap-6 bp-lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <div className="bp-lg:hidden">
              <SummarySkeleton
                showQuantityControls={showQuantityControls}
                showSecondaryAction={isRental}
              />
            </div>
            <Skeleton className="-mx-3 h-32 w-[calc(100%+1.5rem)] rounded-none bp-sm:-mx-4 bp-sm:w-[calc(100%+2rem)] bp-md:mx-0 bp-md:w-full bp-md:rounded-2xl" />
            <StringSelectionCardSkeleton viewMode="grid" />
          </main>
          <div className="hidden bp-lg:block">
            <StickyAside>
              <SummarySkeleton
                showQuantityControls={showQuantityControls}
                showSecondaryAction={isRental}
              />
            </StickyAside>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
