import SiteContainer from '@/components/layout/SiteContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ServicesLoading() {
  return (
    <div className="min-h-[70svh] bg-muted/20 py-8">
      <SiteContainer variant="wide" className="space-y-8">
        <section className="rounded-2xl border border-border/50 bg-card/80 p-6 md:p-10">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="mt-3 h-5 w-full max-w-3xl" />
          <Skeleton className="mt-2 h-5 w-2/3 max-w-2xl" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/50">
              <CardHeader className="space-y-3">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-44" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </SiteContainer>
    </div>
  );
}
