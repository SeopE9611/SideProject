import SiteContainer from '@/components/layout/SiteContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function BoardLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <SiteContainer className="container mx-auto px-4 py-8 space-y-6">
        <section className="space-y-3">
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </section>

        <Card className="border-border/50 bg-card/90">
          <CardContent className="p-4 bp-sm:p-5">
            <div className="flex flex-wrap items-center gap-2 bp-sm:gap-3">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-full bp-sm:ml-auto bp-sm:w-52" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/90">
                <CardContent className="p-4 bp-sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-[85%]" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-4 w-[70%]" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/50 bg-card/90 h-fit">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </SiteContainer>
    </div>
  );
}
