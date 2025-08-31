// app/admin/products/loading.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle, AlertTriangle, XCircle, PlusCircle, Search, X as XIcon } from 'lucide-react';

function NumberSkeleton() {
  return <span className="inline-block h-7 w-12 rounded bg-gray-200 animate-pulse align-middle" />;
}

export default function ProductsLoading() {
  const PAGE_SIZE = 10;
  const ROW_PX = 56; // h-14

  return (
    <div className="min-h-full flex flex-col p-6 space-y-8">
      <div className="mb-2">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-md">
            <Package className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">상품 관리</h1>
            <p className="mt-2 text-base text-gray-600">테니스 스트링 상품을 효율적으로 관리하세요</p>
          </div>
        </div>
      </div>

      {/* 전역 통계 카드: 라벨은 실 UI, 숫자만 스켈레톤 */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 shrink-0">
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 상품</p>
                <p className="text-3xl font-bold text-gray-900">
                  <NumberSkeleton />
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">판매 중</p>
                <p className="text-3xl font-bold text-gray-900">
                  <NumberSkeleton />
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">재고 부족</p>
                <p className="text-3xl font-bold text-gray-900">
                  <NumberSkeleton />
                </p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">품절</p>
                <p className="text-3xl font-bold text-gray-900">
                  <NumberSkeleton />
                </p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3">
                <XCircle className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 리스트 카드: 헤더/검색 영역은 실제 UI 비슷하게, 본문은 테이블 스켈레톤 */}
      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-4 shrink-0">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">스트링 목록</CardTitle>
              <CardDescription className="text-gray-600">목록을 불러오는 중…</CardDescription>
            </div>
            <Button disabled className="opacity-70">
              <PlusCircle className="mr-2 h-4 w-4" />
              스트링 등록
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 min-h-0 flex flex-col">
          {/* 검색창 자리는 잡아두기 */}
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <div className="pl-8 h-9 text-xs rounded-md bg-gray-100" />
              <button className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3 opacity-50 cursor-not-allowed">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 테이블 스켈레톤: 고정 높이로 CLS 방지 */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Table className="table-fixed">
              <TableHeader className="bg-white/60 sticky top-0 z-10">
                <TableRow>
                  {['스트링명', '브랜드', '게이지', '재질', '가격', '재고', '상태', '관리'].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="p-0">
                      <div className="h-14 animate-pulse bg-gray-50" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 자리도 살짝 확보 */}
          <div className="mt-4 h-9" />
        </CardContent>
      </Card>
    </div>
  );
}
