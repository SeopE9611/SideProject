import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function OrdersLoading() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-7xl">
        {/* 페이지 제목 스켈레톤 */}
        <div className="mb-8">
          <Skeleton className="h-10 w-48 rounded-md bg-muted dark:bg-card" />
          <Skeleton className="mt-2 h-5 w-96 rounded bg-background dark:bg-card" />
        </div>

        {/* 필터 및 검색 스켈레톤 */}
        <Card className="mb-8 border border-muted bg-muted/30 shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32 rounded bg-muted dark:bg-card" />
            <Skeleton className="h-4 w-80 mt-2 rounded bg-background dark:bg-card" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <Skeleton className="h-10 flex-1 rounded-md bg-muted dark:bg-card" />
              <div className="flex flex-wrap gap-2 md:flex-nowrap">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full md:w-[180px] rounded-md bg-muted dark:bg-card" />
                ))}
                <Skeleton className="h-10 w-32 ml-auto rounded-md bg-muted dark:bg-card" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 목록 테이블 스켈레톤 */}
        <Card className="border border-muted bg-muted/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32 rounded bg-muted dark:bg-card" />
              <Skeleton className="h-4 w-36 rounded bg-background dark:bg-card" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(7)].map((_, idx) => (
                      <TableHead key={idx}>
                        <Skeleton className="h-4 w-20 rounded bg-background dark:bg-card" />
                      </TableHead>
                    ))}
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-24 rounded bg-muted dark:bg-card" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-24 rounded bg-background dark:bg-card" />
                          <Skeleton className="h-3 w-32 rounded bg-background dark:bg-card" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32 rounded bg-background dark:bg-card" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full bg-background dark:bg-card" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full bg-background dark:bg-card" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full bg-background dark:bg-card" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-20 ml-auto rounded bg-background dark:bg-card" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full bg-muted dark:bg-card" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
