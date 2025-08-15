'use client';
import { Card, CardContent } from '@/components/ui/card';

export default function ReviewSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70">
      <CardContent className="p-4 md:p-5 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 rounded bg-slate-200/60" />
          <div className="h-4 w-20 rounded bg-slate-200/60" />
        </div>
        <div className="h-4 w-40 rounded bg-slate-200/60" />
        <div className="h-14 w-full rounded bg-slate-200/60" />
        <div className="h-8 w-28 rounded bg-slate-200/60" />
      </CardContent>
    </Card>
  );
}
