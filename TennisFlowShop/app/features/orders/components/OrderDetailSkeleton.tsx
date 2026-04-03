import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailSkeleton() {
  return (
    <div className="container py-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1500px] space-y-6 lg:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-72 rounded bg-muted dark:bg-card animate-pulse" />
            <Skeleton className="mt-2 h-4 w-48 rounded bg-card animate-pulse" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded bg-muted dark:bg-card animate-pulse" />
            <Skeleton className="h-10 w-36 rounded bg-muted dark:bg-card animate-pulse" />
          </div>
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-40 rounded bg-muted dark:bg-card animate-pulse" />
            <Skeleton className="mt-1 h-4 w-48 rounded bg-card animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Skeleton className="h-9 w-32 rounded-full bg-muted dark:bg-card animate-pulse" />
              <Skeleton className="h-9 w-24 rounded-full bg-muted dark:bg-card animate-pulse" />
              <Skeleton className="h-9 w-32 ml-auto rounded-md bg-muted dark:bg-card animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32 rounded bg-muted dark:bg-card animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-4 w-24 rounded bg-card animate-pulse" />
                    <Skeleton className="mt-1 h-5 w-full rounded bg-muted dark:bg-card animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded bg-muted dark:bg-card animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="border-b bg-muted/50 p-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32 bg-card animate-pulse rounded" />
                  <Skeleton className="h-4 w-16 bg-card animate-pulse rounded" />
                  <Skeleton className="h-4 w-16 bg-card animate-pulse rounded" />
                  <Skeleton className="h-4 w-16 bg-card animate-pulse rounded" />
                </div>
              </div>
              <div className="p-3 space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="flex flex-col gap-1 w-1/2">
                      <Skeleton className="h-4 w-40 bg-muted dark:bg-card animate-pulse rounded" />
                      <Skeleton className="h-3 w-3/4 bg-muted dark:bg-card animate-pulse rounded" />
                    </div>
                    <Skeleton className="h-4 w-16 bg-card animate-pulse rounded" />
                    <Skeleton className="h-4 w-16 bg-card animate-pulse rounded" />
                    <Skeleton className="h-4 w-16 bg-card animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded bg-muted dark:bg-card animate-pulse" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[100px] w-full rounded bg-card animate-pulse" />
            <Skeleton className="mt-4 h-10 w-24 rounded bg-muted dark:bg-card animate-pulse" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded bg-muted dark:bg-card animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex">
                  <div className="mr-4 flex flex-col items-center">
                    <Skeleton className="h-10 w-10 rounded-full bg-muted dark:bg-card animate-pulse" />
                    {i < 2 && <div className="h-full w-px bg-muted dark:bg-card" />}
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32 bg-muted dark:bg-card animate-pulse rounded" />
                      <Skeleton className="h-4 w-24 bg-muted dark:bg-card animate-pulse rounded" />
                    </div>
                    <Skeleton className="mt-2 h-4 w-full bg-card animate-pulse rounded" />
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
