import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 py-7 sm:py-9 md:py-10 space-y-5 sm:space-y-7">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="bg-muted/30 border-b p-4 sm:p-5 md:p-6">
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5 md:p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
