import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationDetailLoading() {
  return (
    <div className="container py-6 lg:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6 lg:space-y-8">
        <div>
          <Skeleton className="mb-4 h-9 w-32" />
          <Skeleton className="mb-2 h-9 w-40" />
          <Skeleton className="h-5 w-80" />
        </div>

        {/* 요약 카드 */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Skeleton className="mb-2 h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
        </Card>

        {/* 신청자 정보 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Skeleton className="mb-1 h-4 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div>
                <Skeleton className="mb-1 h-4 w-12" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 서비스 정보 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Skeleton className="mb-1 h-4 w-16" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div>
                <Skeleton className="mb-1 h-4 w-20" />
                <Skeleton className="h-5 w-36" />
              </div>
              <div>
                <Skeleton className="mb-1 h-4 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 요청사항 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        {/* 하단 버튼 */}
        <div className="flex justify-center">
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
    </div>
  );
}
