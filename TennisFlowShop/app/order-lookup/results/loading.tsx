import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderLookupResultsLoading() {
  return (
    <div className="min-h-full bg-background">
      <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
        <div className="absolute inset-0 bg-overlay/10" />
        <div className="relative container mx-auto px-4 py-10 md:py-16">
          <div className="text-center">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto mt-6 h-10 w-64 max-w-full" />
            <Skeleton className="mx-auto mt-4 h-6 w-80 max-w-full" />
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          <Skeleton className="h-5 w-44" />

          <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 md:pb-8 space-y-4">
              <Skeleton className="mx-auto h-12 w-12 rounded-full" />
              <Skeleton className="mx-auto h-8 w-52" />
              <CardDescription>
                <Skeleton className="mx-auto h-4 w-56" />
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 pb-6 md:pb-8 space-y-4 md:space-y-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card
                  key={index}
                  className="overflow-hidden border-2 border-border"
                >
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      {Array.from({ length: 4 }).map((__, cell) => (
                        <div
                          key={cell}
                          className="rounded-lg bg-background p-3 space-y-2"
                        >
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-10 w-44" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
