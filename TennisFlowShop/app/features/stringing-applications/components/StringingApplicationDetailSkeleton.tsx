'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

export default function StringingApplicationDetailSkeleton() {
  return (
    <div className="container py-10 mx-auto max-w-4xl space-y-8">
      {/* 헤더 스켈레톤 */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/2 rounded-md" /> {/* 타이틀 */}
          <Skeleton className="h-6 w-1/3 rounded-md" /> {/* 서브타이틀 */}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" /> {/* 편집 모드 버튼 */}
          <Skeleton className="h-8 w-20 rounded-md" /> {/* 목록으로 돌아가기 */}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 신청 상태 카드 */}
        <Card className="md:col-span-3">
          <CardHeader className="space-y-2 pb-3">
            <Skeleton className="h-6 w-1/4 rounded-md" /> {/* 카드 타이틀 */}
            <Skeleton className="h-4 w-1/6 rounded-md" /> {/* 날짜 */}
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="h-8 w-full rounded-md" /> {/* Select + cancel */}
          </CardContent>
        </Card>

        {/* 고객 정보 */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded-md" /> {/* 고객 정보 타이틀 */}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/4 rounded-md" />
          </CardContent>
        </Card>

        {/* 결제 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded-md" /> {/* 결제 정보 타이틀 */}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-2/5 rounded-md" />
            <Skeleton className="h-4 w-1/3 rounded-md" />
          </CardContent>
        </Card>

        {/* 신청 스트링 정보 */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-40 rounded-md" /> {/* 스트링 정보 타이틀 */}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Skeleton className="h-4 w-1/3 rounded-md" /> {/* 희망 일시 */}
            <Skeleton className="h-4 w-2/3 rounded-md" /> {/* 스트링 정보 */}
            <Skeleton className="h-4 w-1/4 rounded-md" /> {/* 라켓 종류 */}
          </CardContent>
        </Card>

        {/* 요청사항 */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded-md" /> {/* 요청사항 타이틀 */}
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full rounded-md" /> {/* 요청사항 내용 */}
          </CardContent>
        </Card>

        {/* 처리 이력 */}
        <div className="md:col-span-3 space-y-4">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
