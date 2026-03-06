import SiteContainer from '@/components/layout/SiteContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="pb-8 bp-sm:pb-12">
      <div className="relative overflow-hidden bg-card border-b border-border">
        <SiteContainer variant="wide" className="relative py-8 bp-sm:py-10 bp-lg:py-12">
          <div className="space-y-5 bp-sm:space-y-6 animate-pulse">
            <div className="space-y-3">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>

            <div className="grid grid-cols-2 bp-lg:grid-cols-4 gap-3 bp-sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 border border-border space-y-3">
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
          <Card className="hidden bp-lg:block border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>

          <div className="bp-lg:col-span-3 space-y-6">
            <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
              <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                <div className="grid grid-cols-4 bp-md:grid-cols-9 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
              <CardHeader className="space-y-3 bg-muted border-b border-border p-4 bp-sm:p-6">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </CardHeader>
              <CardContent className="p-4 bp-sm:p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
