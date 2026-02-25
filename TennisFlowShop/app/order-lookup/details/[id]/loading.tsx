import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function OrderDetailLoading() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-4 pl-0 flex items-center" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          주문 목록으로 돌아가기
        </Button>

        <Card className="shadow-md mb-6">
          <CardHeader className="space-y-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">주문 상세 정보</CardTitle>
                <CardDescription className="mt-1">
                  <Skeleton className="h-4 w-40" />
                </CardDescription>
              </div>
              <div className="mt-2 md:mt-0">
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </CardHeader>
          <Separator />

          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* 주문 정보 스켈레톤 */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  <Skeleton className="h-6 w-32 inline-block" />
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        <Skeleton className="h-4 w-20" />
                      </dt>
                      <dd>
                        <Skeleton className="h-5 w-32 mt-1" />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        <Skeleton className="h-4 w-20" />
                      </dt>
                      <dd>
                        <Skeleton className="h-5 w-32 mt-1" />
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 배송 정보 스켈레톤 */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  <Skeleton className="h-6 w-32 inline-block" />
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <dl className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <dt className="text-sm text-muted-foreground">
                          <Skeleton className="h-4 w-20" />
                        </dt>
                        <dd>
                          <Skeleton className="h-5 w-full mt-1" />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {/* 주문 상품 스켈레톤 */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  <Skeleton className="h-6 w-32 inline-block" />
                </h3>
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex flex-col md:flex-row border rounded-lg p-4">
                      <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-start mb-4 md:mb-0">
                        <Skeleton className="w-20 h-20 rounded" />
                      </div>
                      <div className="flex-grow md:ml-4">
                        <Skeleton className="h-5 w-full max-w-xs" />
                        <Skeleton className="h-4 w-full max-w-xs mt-2" />
                        <div className="flex flex-col md:flex-row md:items-center justify-between mt-3">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-24 mt-1 md:mt-0" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 결제 정보 스켈레톤 */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  <Skeleton className="h-6 w-32 inline-block" />
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <dl className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex justify-between">
                        <dt>
                          <Skeleton className="h-4 w-20" />
                        </dt>
                        <dd>
                          <Skeleton className="h-4 w-24" />
                        </dd>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <dt>
                        <Skeleton className="h-5 w-24" />
                      </dt>
                      <dd>
                        <Skeleton className="h-5 w-28" />
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
