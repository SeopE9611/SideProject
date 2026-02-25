'use client';

import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const LIMIT = 5;

export function HistorySkeleton() {
  return (
    <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        {/* 제목 스켈레톤 */}
        <Skeleton className="h-6 w-24 rounded bg-muted/80 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="flex animate-pulse">
              {/* 타임라인 아이콘 자리 */}
              <div className="h-10 w-10 rounded-full bg-muted/80" />
              {/* 텍스트 자리 */}
              <div className="ml-4 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 rounded bg-muted/80" />
                <Skeleton className="h-4 w-full rounded bg-muted/80" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
