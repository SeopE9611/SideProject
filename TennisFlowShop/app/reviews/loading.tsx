import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReviewSkeleton from "./_components/ReviewSkeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-background">
      <SiteContainer className="py-6 bp-md:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Card variant="feature" className="overflow-hidden rounded-hero">
            <CardContent className="grid gap-7 p-5 bp-sm:p-8 bp-lg:grid-cols-[1.08fr_0.92fr] bp-lg:items-center bp-lg:p-10">
              <div className="space-y-5">
                <Skeleton className="h-6 w-40 rounded-control" />
                <Skeleton className="h-16 w-full max-w-2xl rounded-control bp-lg:h-24" />
                <Skeleton className="h-12 w-4/5 rounded-control" />
                <div className="grid gap-2 bp-sm:flex">
                  <Skeleton className="h-11 w-full rounded-control bp-sm:w-48" />
                  <Skeleton className="h-11 w-full rounded-control bp-sm:w-36" />
                </div>
              </div>
              <div className="grid gap-3 bp-sm:grid-cols-3 bp-lg:grid-cols-1">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-control" />)}
              </div>
            </CardContent>
          </Card>
          <Card variant="feature" className="rounded-panel">
            <CardContent className="space-y-4 p-4 bp-md:p-5">
              <Skeleton className="h-11 w-full rounded-control" />
              <div className="hidden gap-3 bp-md:flex">
                <Skeleton className="h-10 w-36 rounded-control" />
                <Skeleton className="h-10 w-32 rounded-control" />
                <Skeleton className="h-10 w-28 rounded-control" />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-4 bp-lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <ReviewSkeleton key={index} />)}
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
