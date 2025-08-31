'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { PlusCircle, Search, MoreHorizontal, Package, AlertTriangle, CheckCircle, X, CheckCircle2, TriangleAlert, XCircle, ArrowUp, ArrowUpDown, ArrowDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import BrandFilter from '@/app/admin/products/product-filters/BrandFilter';
import MaterialFilter from '@/app/admin/products/product-filters/MaterialFilter';
import StockStatusFilter from '@/app/admin/products/product-filters/StockStatusFilter';
import { cn } from '@/lib/utils';
import ProductsTableSkeleton from '@/app/admin/products/ProductsTableSkeleton';

type Product = {
  _id: string;
  name: string;
  sku: string;
  brand: string;
  gauge: string;
  material: string;
  price: number;
  inventory?: { stock: number; lowStock?: number };
  computedStatus?: StatusKey;
};

const STATUS_KEYS = ['active', 'low_stock', 'out_of_stock'] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

// 상태 매핑(아이콘+색)
const STATUS_UI: Record<StatusKey, { label: string; color: string; Icon: React.ElementType }> = {
  active: { label: '판매중', color: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200', Icon: CheckCircle2 },
  low_stock: { label: '재고 부족', color: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200', Icon: TriangleAlert },
  out_of_stock: { label: '품절', color: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200', Icon: XCircle },
};

// 브랜드, 재질 매핑
const BRAND_OPTIONS = [
  { id: 'babolat', label: '바볼랏' },
  { id: 'wilson', label: '윌슨' },
  { id: 'head', label: '헤드' },
  { id: 'yonex', label: '요넥스' },
  { id: 'luxilon', label: '루키론' },
  { id: 'technifibre', label: '테크니파이버' },
  { id: 'solinco', label: '솔린코' },
  { id: 'dunlop', label: '던롭' },
  { id: 'gamma', label: '감마' },
  { id: 'prince', label: '프린스' },
  { id: 'kirschbaum', label: '키르쉬바움' },
  { id: 'gosen', label: '고센' },
] as const;

const MATERIAL_OPTIONS = [
  { id: 'polyester', label: '폴리에스터' },
  { id: 'multifilament', label: '멀티필라멘트' },
  { id: 'natural_gut', label: '천연 거트' },
  { id: 'synthetic_gut', label: '합성 거트' },
  { id: 'hybrid', label: '하이브리드' },
] as const;

const BRAND_LABEL: Record<string, string> = Object.fromEntries(BRAND_OPTIONS.map((o) => [o.id, o.label]));
const MATERIAL_LABEL: Record<string, string> = Object.fromEntries(MATERIAL_OPTIONS.map((o) => [o.id, o.label]));
const brandLabel = (id?: string) => (id ? BRAND_LABEL[id] ?? id : '');
const materialLabel = (id?: string) => (id ? MATERIAL_LABEL[id] ?? id : '');

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// 입력 디바운스
function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function ProductsClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebounce(searchTerm, 250);

  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const ROW_PX = 56; // 한 행 높이를 56px = h-14 로 고정

  // 허용되는 정렬 필드(서버 allowMap과 일치시켜야 함)
  type SortField = 'name' | 'brand' | 'gauge' | 'material' | 'price' | 'stock' | 'createdAt';

  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' } | null>(null);

  // 헤더 클릭 시 토글
  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }; // 1클릭: asc
      if (prev.dir === 'asc') return { field, dir: 'desc' }; // 2클릭: desc
      return null; // 3클릭: 기본(등록순)
    });
    setPage(1);
  };
  // 서버 페이지네이션 쿼리 / 쿼리스트링: sort가 있을 때만 세팅
  const sp = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    q: debouncedTerm,
    brand: brandFilter,
    material: materialFilter,
    status: statusFilter,
  });
  if (sort) sp.set('sort', `${sort.field}:${sort.dir}`);
  const qs = sp.toString();

  type ApiRes = {
    items: Product[];
    total: number;
    page: number;
    pageSize: number;
    totalsByStatus: Record<'active' | 'low_stock' | 'out_of_stock', number>; // 전역 통계(필터 무시)
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiRes>(`/api/admin/products?${qs}`, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true, // SWR v2 전환 중 깜빡임 줄어듬
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 전역 카운트(필터 무시)
  const totalsByStatus = data?.totalsByStatus ?? { active: 0, low_stock: 0, out_of_stock: 0 };
  const totalAll = totalsByStatus.active + totalsByStatus.low_stock + totalsByStatus.out_of_stock;
  const activeAll = totalsByStatus.active;
  const lowStockAll = totalsByStatus.low_stock;
  const outOfStockAll = totalsByStatus.out_of_stock;

  // 필터/검색 변경 시 1페이지로
  useEffect(() => {
    setPage(1);
  }, [brandFilter, materialFilter, statusFilter, debouncedTerm]);

  // totalPages 변동 시 현재 페이지 보정(로딩 중에는 클램프 금지)
  useEffect(() => {
    if (isLoading || isValidating) return;
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages, isLoading, isValidating]);

  // 삭제 핸들러
  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const err = await res.json();
        showErrorToast(err.message || '삭제 중 오류가 발생했습니다.');
        return;
      }
      showSuccessToast('상품이 삭제되었습니다.');
      await mutate();
    } catch {
      showErrorToast('서버 오류가 발생했습니다.');
    }
  };

  // 접근성(aria-sort) + 클릭 가능한 헤더
  const SortBtn: React.FC<{ field: SortField; children: React.ReactNode; align?: 'left' | 'center' | 'right' }> = ({ field, children, align = 'left' }) => {
    const active = !!sort && sort.field === field;
    const aria = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        aria-sort={aria as any}
        className={cn('group inline-flex w-full items-center gap-1 select-none whitespace-nowrap', align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left')}
        title={active ? (sort!.dir === 'asc' ? '오름차순' : '내림차순') : '등록순'}
      >
        <span className="font-medium">{children}</span>
        {active ? sort!.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 opacity-80" /> : <ArrowDown className="h-3.5 w-3.5 opacity-80" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-80" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20">
      <div className="container py-8 px-6">
        {error && <div className="text-center text-red-500">상품 로드 중 오류가 발생했습니다.</div>}
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

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 shrink-0">
          {[
            {
              label: '전체 상품',
              icon: <Package className="h-6 w-6 text-blue-600" />,
              value: totalAll,
              bgColor: 'bg-blue-50 dark:bg-blue-950/20',
            },
            {
              label: '판매 중',
              icon: <CheckCircle className="h-6 w-6 text-green-600" />,
              value: activeAll,
              bgColor: 'bg-green-50 dark:bg-green-950/20',
            },
            {
              label: '재고 부족',
              icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
              value: lowStockAll,
              bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
            },
            {
              label: '품절',
              icon: <XCircle className="h-6 w-6 text-rose-600" />,
              value: outOfStockAll,
              bgColor: 'bg-rose-50 dark:bg-rose-950/20',
            },
          ].map((c, i) => (
            <Card key={i} className="shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{c.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{isLoading && !data ? <span className="inline-block h-7 w-12 rounded bg-blue-200/50 dark:bg-blue-800/50 animate-pulse align-middle" /> : c.value}</p>
                  </div>
                  <div className={`${c.bgColor} rounded-xl p-3 border border-blue-100 dark:border-blue-800/30`}>{c.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20 border border-blue-100 dark:border-blue-800/30 flex-1 min-h-0 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border-b border-blue-100 dark:border-blue-800/30 pb-4 shrink-0">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-xl font-semibold text-blue-800 dark:text-blue-200">스트링 목록</CardTitle>
                <CardDescription className="text-blue-600 dark:text-blue-400">{total > 0 ? `총 ${total}개의 스트링이 검색되었습니다.` : isLoading ? '목록을 불러오는 중…' : '조건에 맞는 스트링이 없습니다.'}</CardDescription>
              </div>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg">
                <Link href="/admin/products/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  스트링 등록
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 flex-1 min-h-0 flex flex-col p-6">
            {/* 검색/필터 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-3 md:space-y-0">
              <div className="w-full space-y-3">
                {/* 검색 */}
                <div className="w-full max-w-md">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="스트링명, 브랜드, SKU로 검색"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-xs border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
                    />
                    {searchTerm && (
                      <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 필터 */}
                <div className="grid w-full gap-2 border-t border-blue-100 dark:border-blue-800/30 pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  <BrandFilter value={brandFilter} onChange={setBrandFilter} options={BRAND_OPTIONS.map((o) => o.id)} />
                  <MaterialFilter value={materialFilter} onChange={setMaterialFilter} options={MATERIAL_OPTIONS.map((o) => o.id)} />
                  <StockStatusFilter value={statusFilter} onChange={setStatusFilter} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBrandFilter('all');
                      setMaterialFilter('all');
                      setStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className="w-full border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    필터 초기화
                  </Button>
                  <Button variant="outline" size="sm" className="w-full border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 bg-transparent" onClick={() => setSort(null)}>
                    정렬 초기화
                  </Button>
                </div>
              </div>
            </div>

            {/* 테이블 */}
            <div className="flex-1">
              <div className="overflow-auto rounded-lg border border-blue-100 dark:border-blue-800/30">
                <Table className="table-fixed [&_tr]:border-0">
                  <TableHeader className="sticky top-0 z-10 bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur supports-[backdrop-filter]:bg-blue-50/60 border-b border-blue-100 dark:border-blue-800/30">
                    <TableRow className="border-b border-blue-100 dark:border-blue-800/30">
                      <TableHead className="w-[32%] text-left text-blue-700 dark:text-blue-300">
                        <SortBtn field="name">스트링명</SortBtn>
                      </TableHead>
                      <TableHead className="w-[12%] text-center text-blue-700 dark:text-blue-300">
                        <SortBtn field="brand" align="center">
                          브랜드
                        </SortBtn>
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-blue-700 dark:text-blue-300">
                        <SortBtn field="gauge" align="center">
                          게이지
                        </SortBtn>
                      </TableHead>
                      <TableHead className="w-[14%] text-center text-blue-700 dark:text-blue-300">
                        <SortBtn field="material" align="center">
                          재질
                        </SortBtn>
                      </TableHead>
                      <TableHead className="w-[12%] text-right text-blue-700 dark:text-blue-300">
                        <SortBtn field="price" align="right">
                          가격
                        </SortBtn>
                      </TableHead>
                      <TableHead className="w-[10%] text-right text-blue-700 dark:text-blue-300">
                        <SortBtn field="stock" align="right">
                          재고
                        </SortBtn>
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-blue-700 dark:text-blue-300">상태</TableHead>
                      <TableHead className="w-[10%] text-right text-blue-700 dark:text-blue-300">관리</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading || isValidating ? (
                      // 전환/첫 로딩: 고정 행수 스켈레톤
                      <ProductsTableSkeleton rows={PAGE_SIZE} />
                    ) : items.length === 0 ? (
                      <TableRow className="border-0">
                        <TableCell colSpan={8} className="text-center" style={{ height: ROW_PX * PAGE_SIZE }}>
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">조건에 맞는 스트링이 없습니다.</div>
                            <div className="text-xs text-muted-foreground">필터를 초기화하거나 검색어를 수정해 보세요.</div>
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBrandFilter('all');
                                  setMaterialFilter('all');
                                  setStatusFilter('all');
                                  setSearchTerm('');
                                }}
                                className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              >
                                필터 초기화
                              </Button>
                              {searchTerm && (
                                <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="hover:bg-blue-50 dark:hover:bg-blue-950/20">
                                  검색어 지우기
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((s) => {
                        const statusKey: StatusKey = (s.computedStatus ?? 'active') as StatusKey;
                        const S = STATUS_UI[statusKey];
                        return (
                          <TableRow key={s._id} className="h-14 border-b border-blue-100 dark:border-blue-800/30 last:border-b-0 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 even:bg-blue-50/20 dark:even:bg-blue-950/5 transition-colors">
                            <TableCell className="text-left align-middle py-3">
                              <Link href={`/products/${s._id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                <div className="space-y-1">
                                  <div className="truncate font-medium text-gray-900 dark:text-gray-100">{s.name}</div>
                                  <div className="font-mono text-[11px] text-muted-foreground">{s.sku}</div>
                                </div>
                              </Link>
                            </TableCell>

                            <TableCell className="text-center align-middle">
                              <Badge variant="secondary" className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                                {brandLabel(s.brand)}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center align-middle text-gray-900 dark:text-gray-100">{s.gauge}</TableCell>
                            <TableCell className="text-center align-middle text-gray-900 dark:text-gray-100">{materialLabel(s.material)}</TableCell>

                            <TableCell className="text-right align-middle font-medium text-gray-900 dark:text-gray-100">{s.price?.toLocaleString?.() ?? s.price}원</TableCell>

                            <TableCell className="text-right align-middle">
                              {s.inventory?.stock && s.inventory.stock > 0 ? <span className="font-medium text-blue-600 dark:text-blue-400">{s.inventory.stock}</span> : <span className="font-medium text-rose-600 dark:text-rose-400">품절</span>}
                            </TableCell>

                            <TableCell className="text-center align-middle">
                              <Badge variant="outline" className={cn('inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full', S.color)}>
                                <S.Icon className="h-3.5 w-3.5" />
                                {S.label}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right align-middle">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="p-0 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-blue-100 dark:border-blue-800/30">
                                  <DropdownMenuLabel>작업</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/products/${s._id}`}>상세 보기</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/products/${s._id}/edit`}>수정</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(s._id)}>
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}

                    {/* 마지막 페이지 보정용 필러 행(로딩/빈상태 제외) */}
                    {!(isLoading || isValidating) &&
                      items.length > 0 &&
                      Array.from({ length: Math.max(0, PAGE_SIZE - items.length) }).map((_, i) => (
                        <TableRow key={`filler-${i}`} className="pointer-events-none">
                          <TableCell colSpan={8} className="p-0">
                            <div className="h-14" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 페이지네이션 */}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                  이전
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                  다음
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
