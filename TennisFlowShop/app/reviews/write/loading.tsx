import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-5 min-h-[80vh]">
          <Card className="rounded-2xl border-border/60">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-56" />
              <div className="flex gap-3 rounded-2xl border border-border bg-muted/20 p-4">
                <Skeleton className="h-16 w-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <Card className="rounded-2xl border-border/60">
              <CardContent className="space-y-5 p-6">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-28 w-full" />
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-11 w-28" />
                  <Skeleton className="h-11 w-28" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60">
              <CardContent className="space-y-2 p-6">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
