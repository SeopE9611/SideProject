import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/60">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-7 w-16 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
