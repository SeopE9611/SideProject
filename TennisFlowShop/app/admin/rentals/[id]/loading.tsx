import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/30">
      <div className="container py-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <Card className="border-border/30 bg-muted/30 p-8 shadow-lg">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-36" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl bg-card/60 p-4">
                  <Skeleton className="mb-3 h-4 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="border-border/60">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((__, rowIndex) => (
                    <Skeleton key={rowIndex} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/60">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
