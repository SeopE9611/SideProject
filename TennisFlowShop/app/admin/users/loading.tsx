import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/60">
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full md:w-44" />
              <Skeleton className="h-10 w-full md:w-36" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={`head-${index}`} className="h-4 w-full" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((__, colIndex) => (
                  <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-9 w-full" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
