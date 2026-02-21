import SiteContainer from '@/components/layout/SiteContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function BoardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-card">
      <SiteContainer className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 스켈레톤 */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-12 w-48" />
          </div>
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        {/* 통계 카드 스켈레톤 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 bg-card dark:bg-card shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 메인 게시판 카드 스켈레톤 */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-0 bg-card dark:bg-card shadow-xl backdrop-blur-sm h-full">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="border-b border-border dark:border-border last:border-0 pb-4 last:pb-0">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex space-x-4">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 추가 링크 섹션 스켈레톤 */}
        <div className="bg-card dark:bg-card backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div className="text-center space-y-6">
            <Skeleton className="h-8 w-64 mx-auto" />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
