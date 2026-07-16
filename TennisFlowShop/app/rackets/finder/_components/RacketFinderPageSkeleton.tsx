import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";
import FinderRacketCardSkeleton from "@/app/rackets/finder/_components/FinderRacketCardSkeleton";

export default function RacketFinderPageSkeleton() {
  return (
    <SiteContainer variant="wide" className="py-6">
      <p className="sr-only" role="status" aria-live="polite">라켓 찾기 화면을 불러오는 중입니다.</p>
      <div className="space-y-5 bp-md:space-y-6" aria-hidden="true">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-24 rounded-2xl" />
        <div className="bp-lg:grid bp-lg:grid-cols-[320px_minmax(0,1fr)] bp-lg:gap-8">
          <Skeleton className="hidden h-[620px] rounded-panel bp-lg:block" />
          <div className="space-y-4">
            <Skeleton className="h-12 rounded-xl" />
            <FinderRacketCardSkeleton count={5} />
          </div>
        </div>
      </div>
    </SiteContainer>
  );
}
