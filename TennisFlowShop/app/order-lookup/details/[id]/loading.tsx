import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="min-h-full bg-background">
      <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
        <div className="absolute inset-0 bg-overlay/10" />
        <div className="relative container mx-auto px-4 py-10 md:py-16">
          <div className="text-center">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto mt-6 h-10 w-72 max-w-full" />
            <Skeleton className="mx-auto mt-4 h-6 w-52 max-w-full" />
            <Skeleton className="mx-auto mt-4 h-9 w-40 rounded-full" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
          <Skeleton className="h-5 w-40" />

          {Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={index}
              className="rounded-2xl border-border/50 bg-card/80 shadow-sm"
            >
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </CardHeader>
              <CardContent className="space-y-3 pb-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[88%]" />
                <Skeleton className="h-4 w-[72%]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
