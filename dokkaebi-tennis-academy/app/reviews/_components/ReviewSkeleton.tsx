'use client';
import { Card, CardContent } from '@/components/ui/card';

export default function ReviewSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border dark:border-border">
      <CardContent className="p-4 md:p-5 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-14 w-full rounded bg-muted" />
        <div className="h-8 w-28 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
