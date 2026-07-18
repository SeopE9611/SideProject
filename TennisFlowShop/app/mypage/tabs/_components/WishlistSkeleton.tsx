import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">위시리스트를 불러오는 중입니다.</span>
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card
          key={`wishlist-skeleton-${idx}`}
          variant="feature"
          className="flex h-full flex-col overflow-hidden border-border/80 bg-card shadow-soft"
        >
          <CardContent className="flex h-full flex-col p-0">
            <div className="border-b border-border/70 bg-muted/20 p-3">
              <Skeleton className="aspect-[4/3] w-full rounded-control" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-control" />
                <Skeleton className="h-5 w-full rounded-control" />
                <Skeleton className="h-5 w-4/5 rounded-control" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-control" />
                <Skeleton className="h-4 w-40 rounded-control" />
              </div>
              <div className="space-y-2 rounded-control border border-border/70 bg-muted/20 p-3">
                <Skeleton className="h-4 w-28 rounded-control" />
                <Skeleton className="h-4 w-36 rounded-control" />
                <Skeleton className="h-4 w-24 rounded-control" />
              </div>
              <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Skeleton className="h-9 w-full rounded-control" />
                <Skeleton className="h-9 w-full rounded-control" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
