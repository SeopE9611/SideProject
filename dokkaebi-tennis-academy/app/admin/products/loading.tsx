'use client';

import { Package, CheckCircle, AlertTriangle, TrendingUp, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROWS = 10; // PAGE_SIZE와 동일

export default function ProductsLoading() {
  return (
    <div className="min-h-full flex flex-col p-6 space-y-8">
      {/* 페이지 제목 */}
      <section className="mb-8 shrink-0">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="h-7 w-40 rounded bg-gray-200/70" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-200/60" />
          </div>
        </div>
      </section>

      {/* 통계 카드 */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-16 rounded bg-gray-200/70 mb-2" />
                  <div className="h-6 w-10 rounded bg-gray-200/80" />
                </div>
                <div className="bg-gray-100 rounded-xl p-3">
                  <div className="h-6 w-6 rounded bg-gray-200/70" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* 상품 관리 카드 */}
      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-4 shrink-0">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">스트링 목록</CardTitle>
              <CardDescription className="text-gray-600">
                <span className="h-4 w-56 inline-block rounded bg-gray-200/70 align-middle" />
              </CardDescription>
            </div>
            <div className="h-9 w-28 rounded bg-gray-200/80" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 min-h-0 flex flex-col">
          {/* 검색/필터 영역 스켈레톤 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-3 md:space-y-0">
            <div className="w-full space-y-3">
              <div className="w-full max-w-md">
                <div className="relative">
                  <div className="absolute left-2.5 top-2.5 h-3.5 w-3.5 rounded bg-gray-200/70" />
                  <Input className="pl-8 h-9 text-xs" disabled placeholder=" " />
                  <div className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3">
                    <div className="h-full w-full bg-gray-200/70 rounded" />
                  </div>
                </div>
              </div>

              <div className="grid w-full gap-2 border-t pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-9 w-full rounded bg-gray-200/70" />
                ))}
              </div>
            </div>
          </div>

          {/* 리스트 영역: 마지막 페이지 소량일 때도 높이 유지 */}
          <div className="flex-1 min-h-[calc(100svh-14rem)]">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    {['스트링명', '브랜드', '게이지', '재질', '가격', '재고', '상태', '관리'].map((h) => (
                      <TableHead key={h} className="font-semibold text-gray-900">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: ROWS }).map((_, row) => (
                    <TableRow key={row} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, col) => (
                        <TableCell key={col}>
                          <div className="h-4 w-[70%] rounded bg-gray-200/70" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 페이지네이션 자리(버튼 크기 유지) */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <span className="h-5 w-10 rounded bg-gray-200/70" />
            <div className="h-9 w-16 rounded border border-gray-200 bg-gray-100" />
            <div className="h-9 w-16 rounded border border-gray-200 bg-gray-100" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
