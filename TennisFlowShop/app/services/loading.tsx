import SiteContainer from '@/components/layout/SiteContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ServicesLoading() {
  return (
    <div className="min-h-[70svh] bg-muted/20 py-8 bp-md:py-10">
      <SiteContainer variant="wide" className="space-y-8">
        <section className="rounded-2xl border border-border/50 bg-card/80 p-6 md:p-10 space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-5 w-full max-w-3xl" />
          <Skeleton className="h-5 w-2/3 max-w-xl" />
          <div className="pt-1 flex flex-wrap gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/50">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-6 w-48" />
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Skeleton className="mt-1 h-4 w-4 rounded-full" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[65%]" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-[70%]" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </SiteContainer>
    </div>
  );
}
