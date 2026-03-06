import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="relative mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[400px_1fr] min-h-[80vh]">
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/60">
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-14 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-11 w-40" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
