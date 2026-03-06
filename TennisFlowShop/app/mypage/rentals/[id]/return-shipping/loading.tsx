import SiteContainer from '@/components/layout/SiteContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <SiteContainer variant="wide" className="py-10 min-h-[70svh]">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-40" />
          </CardContent>
        </Card>
      </div>
    </SiteContainer>
  );
}
