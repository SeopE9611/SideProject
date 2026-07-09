import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4 min-h-[80vh]">
          <Card className="rounded-2xl border-border/60">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-28 w-full" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="space-y-2 p-6">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
