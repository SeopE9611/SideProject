import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function BoardPostDetailLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-5 w-[200px]" />
      </div>

      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-[300px]" />
            <Skeleton className="mt-2 h-5 w-[400px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 dark:bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-[300px]" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Skeleton className="h-6 w-[80px]" />
                    <Skeleton className="h-6 w-[80px]" />
                    <Skeleton className="h-6 w-[80px]" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="dark:bg-card">
              <CardHeader>
                <Skeleton className="h-6 w-[120px]" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Skeleton className="mr-2 h-4 w-4" />
                  <div className="space-y-1 w-full">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
                <div className="flex items-center">
                  <Skeleton className="mr-2 h-4 w-4" />
                  <div className="space-y-1 w-full">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                </div>
                <div className="flex items-center">
                  <Skeleton className="mr-2 h-4 w-4" />
                  <div className="space-y-1 w-full">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-4 w-[60px]" />
                  </div>
                </div>
                <div className="flex items-center">
                  <Skeleton className="mr-2 h-4 w-4" />
                  <div className="space-y-1 w-full">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-4 w-[60px]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-card">
              <CardHeader>
                <Skeleton className="h-6 w-[120px]" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 w-3/4">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1 w-3/4">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
