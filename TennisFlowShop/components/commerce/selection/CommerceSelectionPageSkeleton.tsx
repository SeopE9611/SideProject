import SiteContainer from "@/components/layout/SiteContainer";
import StickyAside from "@/components/layout/StickyAside";
import { Skeleton } from "@/components/ui/skeleton";
import { StringSelectionCardSkeleton } from "./StringSelectionCardSkeleton";

type CommerceSelectionPageSkeletonProps = {
  flowType: "purchase" | "rental";
  showQuantityControls?: boolean;
};

function SummarySkeleton({ showQuantityControls }: { showQuantityControls?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-hidden="true">
      <div className="border-b border-border bg-secondary/30 px-5 py-4"><Skeleton className="h-5 w-28" /></div>
      <div className="p-4 bp-md:p-5">
        <div className="flex gap-3"><Skeleton className="h-16 w-16 rounded-xl bp-md:h-20 bp-md:w-20" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-2/3" /></div></div>
        {showQuantityControls && <Skeleton className="mt-5 h-24 w-full rounded-xl" />}
        <Skeleton className="mt-4 h-10 w-full rounded-xl" />
        <Skeleton className="mt-4 h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function CommerceSelectionPageSkeleton({ flowType, showQuantityControls }: CommerceSelectionPageSkeletonProps) {
  const title = flowType === "rental" ? "대여 라켓에 장착할 스트링을 선택하세요" : "라켓에 장착할 스트링을 선택하세요";
  return (
    <div className="min-h-screen bg-background">
      <SiteContainer variant="wide" className="space-y-6 py-5 bp-md:py-8">
        <section className="rounded-panel border border-border bg-card p-4 shadow-sm bp-md:p-5" aria-hidden="true">
          <Skeleton className="h-5 w-24" />
          <div className="mt-4 grid grid-cols-3 gap-2"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-10 rounded-xl" /></div>
          <Skeleton className="mt-4 h-8 w-2/3" /><p className="sr-only">{title} 로딩 중</p><Skeleton className="mt-2 h-5 w-full max-w-2xl" />
        </section>
        <div className="grid gap-6 bp-lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <div className="bp-lg:hidden"><SummarySkeleton showQuantityControls={showQuantityControls} /></div>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <StringSelectionCardSkeleton viewMode="grid" />
          </main>
          <div className="hidden bp-lg:block"><StickyAside><SummarySkeleton showQuantityControls={showQuantityControls} /></StickyAside></div>
        </div>
      </SiteContainer>
    </div>
  );
}
