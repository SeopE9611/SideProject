import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="container mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-3">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-8 w-52" />
          <Skeleton className="mx-auto h-4 w-72" />
        </div>

        <Card className="border-border/60">
          <CardContent className="space-y-5 p-6">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
