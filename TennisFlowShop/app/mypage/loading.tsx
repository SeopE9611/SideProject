import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";
import UserSectionSkeleton from "./UserSectionSkeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border/60 bg-background">
        <SiteContainer variant="wide" className="space-y-3 py-4 bp-sm:space-y-4 bp-sm:py-5 bp-lg:py-6">
          <UserSectionSkeleton />
          <div className="grid gap-3 bp-lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
            <Skeleton className="h-36 rounded-panel bp-lg:h-32" />
            <Skeleton className="h-28 rounded-panel bp-lg:h-32" />
            <Skeleton className="h-32 rounded-panel bp-lg:col-span-2" />
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-4 bp-sm:py-5 bp-lg:py-8">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <Skeleton className="hidden h-96 rounded-panel bp-lg:block" />
          <div className="min-w-0 bp-lg:col-span-3">
            <Skeleton className="mb-3 h-28 rounded-panel bp-sm:mb-4 bp-lg:hidden" />
            <div className="overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft">
              <div className="border-b border-border bg-muted/30 p-4 bp-sm:p-5 bp-lg:p-6">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-control" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32 rounded-control" />
                    <Skeleton className="h-4 w-56 max-w-full rounded-control" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-3 bp-sm:p-5 bp-lg:p-6">
                <Skeleton className="h-16 rounded-control" />
                <Skeleton className="h-16 rounded-control" />
                <Skeleton className="h-16 rounded-control" />
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
