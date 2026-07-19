"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewSkeleton() {
  return (
    <Card variant="feature" className="overflow-hidden rounded-panel">
      <CardContent className="space-y-4 p-4 bp-md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-20 rounded-control" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded-control" />
        <Skeleton className="h-5 w-48 rounded-control" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-control" />
          <Skeleton className="h-4 w-11/12 rounded-control" />
          <Skeleton className="h-4 w-2/3 rounded-control" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-20 shrink-0 rounded-control" />
          ))}
        </div>
        <Skeleton className="h-9 w-32 rounded-control" />
      </CardContent>
    </Card>
  );
}
