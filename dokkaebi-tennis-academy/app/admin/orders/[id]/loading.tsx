import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function OrderDetailLoading() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 상단 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-72 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <Skeleton className="mt-2 h-4 w-48 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <Skeleton className="h-10 w-36 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>

        {/* 주문 상태 카드 */}
        <Card className="border border-border bg-white/80 dark:bg-gray-800/80 shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <Skeleton className="mt-1 h-4 w-48 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Skeleton className="h-9 w-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <Skeleton className="h-9 w-24 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <Skeleton className="h-9 w-32 ml-auto rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* 3열 카드 (고객, 배송, 결제) */}
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-border bg-white/80 dark:bg-gray-800/80 shadow-sm">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <Skeleton className="mt-1 h-5 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 주문 항목 */}
        <Card className="border border-border bg-white/80 dark:bg-gray-800/80 shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="border-b bg-muted/50 p-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                  <Skeleton className="h-4 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                  <Skeleton className="h-4 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                  <Skeleton className="h-4 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                </div>
              </div>
              <div className="p-3 space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="flex flex-col gap-1 w-1/2">
                      <Skeleton className="h-4 w-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                      <Skeleton className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                    </div>
                    <Skeleton className="h-4 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                    <Skeleton className="h-4 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                    <Skeleton className="h-4 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 메모 */}
        <Card className="border border-border bg-white/80 dark:bg-gray-800/80 shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[100px] w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <Skeleton className="mt-4 h-10 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </CardContent>
        </Card>

        {/* 처리 이력 */}
        <Card className="border border-border bg-white/80 dark:bg-gray-800/80 shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex">
                  <div className="mr-4 flex flex-col items-center">
                    <Skeleton className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
                    {i < 2 && <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />}
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                      <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                    </div>
                    <Skeleton className="mt-2 h-4 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
