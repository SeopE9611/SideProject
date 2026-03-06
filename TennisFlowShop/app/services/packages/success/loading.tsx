import SiteContainer from '@/components/layout/SiteContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-[100svh] bg-muted/20 py-8">
      <SiteContainer variant="wide" className="max-w-4xl space-y-6">
        <Card className="border-border/50">
          <CardHeader className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
      </SiteContainer>
    </div>
  );
}
