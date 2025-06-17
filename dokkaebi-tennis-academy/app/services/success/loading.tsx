import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function StringServiceSuccessLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            {/* 아이콘 스켈레톤 */}
            <div className="flex justify-center mb-6">
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>

            {/* 제목 스켈레톤 */}
            <Skeleton className="h-8 w-3/4 mx-auto mb-4" />

            {/* 설명 스켈레톤 */}
            <div className="space-y-2 mb-8">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>

            {/* 버튼 스켈레톤 */}
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* 하단 안내 스켈레톤 */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="space-y-2">
                <Skeleton className="h-3 w-3/4 mx-auto" />
                <Skeleton className="h-3 w-1/2 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
