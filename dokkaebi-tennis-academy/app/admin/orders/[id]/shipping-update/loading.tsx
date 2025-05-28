import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function ShippingUpdateLoading() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md space-y-6">
        {/* 제목 */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded bg-gray-200" />
          <Skeleton className="h-4 w-48 rounded bg-gray-100" />
        </div>

        {/* 폼 */}
        <Card className="border border-border bg-white/80 shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-40 rounded bg-gray-200" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24 rounded bg-gray-100" />
                <Skeleton className="h-10 w-full rounded bg-gray-200" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full rounded bg-gray-300" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
