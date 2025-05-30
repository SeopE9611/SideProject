'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrderDetailLoading() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">마이페이지</h1>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* 왼쪽 고정 마이페이지 메뉴 */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 로딩 콘텐츠 */}
        <div className="md:col-span-3 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-5 w-32" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
