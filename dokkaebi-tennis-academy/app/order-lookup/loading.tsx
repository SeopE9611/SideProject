import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrderLookupLoading() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="max-w-md mx-auto">
        <Card className="shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">비회원 주문 조회</CardTitle>
            <CardDescription className="text-center">주문 시 입력하신 정보를 통해 주문 내역을 확인하실 수 있습니다.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col">
            <Skeleton className="h-11 w-full" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
