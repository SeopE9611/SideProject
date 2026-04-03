import SiteContainer from "@/components/layout/SiteContainer";
import { TabPanelSkeleton } from "@/components/system/loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pb-8 bp-sm:pb-12">
      <div className="relative overflow-hidden border-b border-border bg-card">
        <SiteContainer
          variant="wide"
          className="relative py-8 bp-sm:py-10 bp-lg:py-12"
        >
          <div className="space-y-5 bp-sm:space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 bp-sm:gap-4 bp-lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-2xl border border-border/50 bg-muted/50 p-4 bp-sm:p-6"
                >
                  <Skeleton className="h-6 w-6 rounded-lg" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-lg:py-12">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <Card className="hidden rounded-2xl border-border/50 bg-card shadow-sm bp-lg:block">
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-2 pb-6">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>

          <div className="space-y-6 bp-lg:col-span-3">
            <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
              <CardContent className="p-4 bp-sm:p-6">
                <div className="grid grid-cols-4 gap-2 bp-md:grid-cols-9">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" />
                  ))}
                </div>
              </CardContent>
            </Card>

            <TabPanelSkeleton rowCount={3} />
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
