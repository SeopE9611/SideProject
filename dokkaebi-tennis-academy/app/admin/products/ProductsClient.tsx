'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { PlusCircle, Search, MoreHorizontal, Package, AlertTriangle, CheckCircle, X, CheckCircle2, TriangleAlert, XCircle, ArrowUp, ArrowUpDown, ArrowDown, Plus } from 'lucide-react';

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
import { adminFetcher, adminMutator, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';
import ProductsTableSkeleton from '@/app/admin/products/ProductsTableSkeleton';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

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
  active: {
    label: '판매중',
    color: 'bg-muted text-foreground ring-1 ring-ring ' + 'dark:bg-muted dark:text-foreground dark:ring-ring',
    Icon: CheckCircle2,
  },
  low_stock: {
    label: '재고 부족',
    color: 'bg-muted text-primary ring-1 ring-ring ' + 'dark:bg-muted dark:text-primary dark:ring-ring',
    Icon: TriangleAlert,
  },
  out_of_stock: {
    label: '품절',
    color: 'bg-muted text-foreground ring-1 ring-ring ' + 'dark:bg-muted dark:text-foreground dark:ring-ring',
    Icon: XCircle,
  },
};

// 브랜드, 재질 매핑
const BRAND_OPTIONS = [
  { id: 'babolat', label: '바볼랏' },
  { id: 'wilson', label: '윌슨' },
  { id: 'head', label: '헤드' },
  { id: 'yonex', label: '요넥스' },
  { id: 'luxilon', label: '럭실론' },
  { id: 'tecnifibre', label: '테크니화이버' },
  { id: 'solinco', label: '솔린코' },
  { id: 'dunlop', label: '던롭' },
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
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<string | null>(null);
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

  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiRes>(`/api/admin/products?${qs}`, adminFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true, // SWR v2 전환 중 깜빡임 줄어듬
  });

  const items = data?.items ?? [];
  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  // 전역 카운트(필터 무시)
  const totalsByStatus = data?.totalsByStatus ?? { active: 0, low_stock: 0, out_of_stock: 0 };
  const totalAll = totalsByStatus.active + totalsByStatus.low_stock + totalsByStatus.out_of_stock;
  const activeAll = totalsByStatus.active;
  const lowStockAll = totalsByStatus.low_stock;
  const outOfStockAll = totalsByStatus.out_of_stock;

  // 삭제 핸들러
  const handleDelete = async (id: string) => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/products/${id}`, { method: 'DELETE' }),
      successMessage: '상품이 삭제되었습니다.',
      fallbackErrorMessage: '삭제 중 오류가 발생했습니다.',
    });
    if (result) await mutate();
  };

  // 접근성(aria-sort) + 클릭 가능한 헤더
  const renderSortButton = ({ field, children, align = 'left' }: { field: SortField; children: React.ReactNode; align?: 'left' | 'center' | 'right' }) => {
    const active = !!sort && sort.field === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        aria-label={`${children} ${active ? (sort!.dir === 'asc' ? '오름차순 정렬됨' : '내림차순 정렬됨') : '정렬 안 됨'}`}
        className={cn('group inline-flex w-full items-center gap-1 select-none whitespace-nowrap', align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left')}
        title={active ? (sort!.dir === 'asc' ? '오름차순' : '내림차순') : '등록순'}
      >
        <span className="font-medium">{children}</span>
        {active ? sort!.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 opacity-80" /> : <ArrowDown className="h-3.5 w-3.5 opacity-80" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-80" />}
      </button>
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleBrandFilterChange = (value: string) => {
    setBrandFilter(value);
    setPage(1);
  };

  const handleMaterialFilterChange = (value: string) => {
    setMaterialFilter(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  useEffect(() => {
    if (commonErrorMessage) showErrorToast(commonErrorMessage);
  }, [commonErrorMessage]);

  const resetFilters = () => {
    setBrandFilter('all');
    setMaterialFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
    setPage(1);
  };

  return (
    <div className={['min-h-screen', 'bg-muted/30'].join(' ')}>
      <div className="container py-8 px-6">
        {commonErrorMessage && <div className="text-center text-destructive">{commonErrorMessage}</div>}
        <div className="mb-2">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-card rounded-full p-3 shadow-md">
              <Package className="h-8 w-8 text-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">상품 관리</h1>
              <p className="mt-2 text-base text-muted-foreground">테니스 스트링 상품을 효율적으로 관리하세요</p>
            </div>
          </div>
        </div>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 shrink-0">
          {[
            {
              label: '전체 상품',
              icon: <Package className="h-6 w-6 text-foreground" />,
              value: totalAll,
              bgColor: 'bg-muted',
            },
            {
              label: '판매 중',
              icon: <CheckCircle className="h-6 w-6 text-foreground" />,
              value: activeAll,
              bgColor: 'bg-muted',
            },
            {
              label: '재고 부족',
              icon: <AlertTriangle className="h-6 w-6 text-warning" />,
              value: lowStockAll,
              bgColor: 'bg-warning/10 dark:bg-warning/15',
            },
            {
              label: '품절',
              icon: <XCircle className="h-6 w-6 text-foreground" />,
              value: outOfStockAll,
              bgColor: 'bg-muted',
            },
          ].map((c, i) => (
            <Card key={i} className="shadow-xl bg-card border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                    <p className="text-3xl font-bold text-foreground">{isLoading && !data ? <span className="inline-block h-7 w-12 rounded bg-muted animate-pulse align-middle" /> : c.value}</p>
                  </div>
                  <div className={`${c.bgColor} rounded-xl p-3 border border-border`}>{c.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="shadow-xl bg-card border border-border flex-1 min-h-0 flex flex-col">
          <CardHeader className="bg-muted/50 border-b border-border pb-4 shrink-0">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">스트링 목록</CardTitle>
                <CardDescription className="text-foreground">{total > 0 ? `총 ${total}개의 스트링이 검색되었습니다.` : isLoading ? '목록을 불러오는 중…' : '조건에 맞는 스트링이 없습니다.'}</CardDescription>
              </div>
              <Button
                asChild
                className={[
                  // 사이즈/레이아웃
                  'h-9 px-4 rounded-lg font-medium inline-flex items-center gap-2',
                  // 색상(라이트/다크 모두 자연스러운 플랫)
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                                    // 경계/그림자: 지나치지 않게만
                  'border border-border/10 dark:border-border/10 shadow-sm hover:shadow',
                  // 포커스 접근성
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'ring-offset-2 ring-offset-background dark:ring-offset-background',
                  // 전환
                  'transition-colors',
                ].join(' ')}
              >
                <Link href="/admin/products/new">
                  <Plus className="mr-2 h-4 w-4" />
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
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-8 h-9 text-xs border-border focus:border-border dark:border-border dark:focus:border-border bg-card"
                    />
                    {searchTerm && (
                      <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3 hover:bg-muted dark:hover:bg-muted" onClick={() => handleSearchChange('')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 필터 */}
                <div className="grid w-full gap-2 border-t border-border pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  <BrandFilter value={brandFilter} onChange={handleBrandFilterChange} options={BRAND_OPTIONS.map((o) => o.id)} />
                  <MaterialFilter value={materialFilter} onChange={handleMaterialFilterChange} options={MATERIAL_OPTIONS.map((o) => o.id)} />
                  <StockStatusFilter value={statusFilter} onChange={handleStatusFilterChange} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="w-full border-border hover:bg-muted dark:border-border dark:hover:bg-card"
                  >
                    필터 초기화
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent border-border hover:bg-muted dark:border-border dark:hover:bg-card"
                    onClick={() => setSort(null)}
                  >
                    정렬 초기화
                  </Button>
                </div>
              </div>
            </div>

            {/* 테이블 */}
            <div className="flex-1">
              <div className="overflow-auto rounded-lg border border-border">
                <Table className="table-fixed [&_tr]:border-0">
                  <TableHeader
                    className="sticky top-0 z-10 backdrop-blur bg-muted supports-[backdrop-filter]:bg-muted dark:bg-card dark:supports-[backdrop-filter]:bg-card border-b border-border"
                  >
                    <TableRow className="border-b border-border">
                      <TableHead className="w-[32%] text-left text-foreground">
                        {renderSortButton({ field: 'name', children: '스트링명' })}
                      </TableHead>
                      <TableHead className="w-[12%] text-center text-foreground">
                        {renderSortButton({ field: 'brand', align: 'center', children: '브랜드' })}
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-foreground">
                        {renderSortButton({ field: 'gauge', align: 'center', children: '게이지' })}
                      </TableHead>
                      <TableHead className="w-[14%] text-center text-foreground">
                        {renderSortButton({ field: 'material', align: 'center', children: '재질' })}
                      </TableHead>
                      <TableHead className="w-[12%] text-right text-foreground">
                        {renderSortButton({ field: 'price', align: 'right', children: '가격' })}
                      </TableHead>
                      <TableHead className="w-[10%] text-right text-foreground">
                        {renderSortButton({ field: 'stock', align: 'right', children: '재고' })}
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-foreground">상태</TableHead>
                      <TableHead className="w-[10%] text-right text-foreground">관리</TableHead>
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
                            <div className="text-sm font-medium text-foreground">조건에 맞는 스트링이 없습니다.</div>
                            <div className="text-xs text-muted-foreground">필터를 초기화하거나 검색어를 수정해 보세요.</div>
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  resetFilters();
                                }}
                                className="border-border hover:bg-muted dark:hover:bg-muted"
                              >
                                필터 초기화
                              </Button>
                              {searchTerm && (
                                <Button variant="ghost" size="sm" onClick={() => handleSearchChange('')} className="hover:bg-muted dark:hover:bg-muted">
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
                          <TableRow
                            key={s._id}
                            className="h-14 border-b border-border last:border-b-0 dark:border-border hover:bg-muted dark:hover:bg-card even:bg-muted dark:even:bg-card transition-colors"
                          >
                            <TableCell className="text-left align-middle py-3">
                              <Link href={`/products/${s._id}`} className="hover:text-foreground dark:hover:text-foreground">
                                <div className="space-y-1">
                                  <div className="truncate font-medium text-foreground">{s.name}</div>
                                  <div className="font-mono text-[11px] text-muted-foreground">{s.sku}</div>
                                </div>
                              </Link>
                            </TableCell>

                            <TableCell className="text-center align-middle">
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 rounded-full border bg-muted text-foreground border-border dark:bg-muted dark:text-foreground dark:border-border"
                              >
                                {brandLabel(s.brand)}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center align-middle text-foreground">{s.gauge}</TableCell>
                            <TableCell className="text-center align-middle text-foreground">{materialLabel(s.material)}</TableCell>

                            <TableCell className="text-right align-middle font-medium text-foreground">{s.price?.toLocaleString?.() ?? s.price}원</TableCell>

                            <TableCell className="text-right align-middle">
                              {s.inventory?.stock && s.inventory.stock > 0 ? <span className="font-medium text-foreground">{s.inventory.stock}</span> : <span className="font-medium text-foreground">품절</span>}
                            </TableCell>

                            <TableCell className="text-center align-middle">
                              <Badge variant="secondary" className={cn('inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border', S.color)}>
                                <S.Icon className="h-3.5 w-3.5" />
                                {S.label}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right align-middle">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="p-0 hover:bg-muted dark:hover:bg-muted">
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-border">
                                  <DropdownMenuLabel>작업</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/products/${s._id}`}>상세 보기</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/products/${s._id}/edit`}>수정</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => setPendingDeleteProductId(s._id)}>
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
                  {currentPage} / {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))} disabled={currentPage <= 1} className="border-border hover:bg-muted dark:hover:bg-muted">
                  이전
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))} disabled={currentPage >= totalPages} className="border-border hover:bg-muted dark:hover:bg-muted">
                  다음
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <AdminConfirmDialog
        open={pendingDeleteProductId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteProductId(null);
        }}
        onCancel={() => setPendingDeleteProductId(null)}
        onConfirm={async () => {
          const productId = pendingDeleteProductId;
          if (!productId) return;
          setPendingDeleteProductId(null);
          await handleDelete(productId);
        }}
        severity="danger"
        title="상품을 삭제할까요?"
        description="삭제 후에는 되돌릴 수 없습니다. 관련 운영 데이터 영향을 확인한 뒤 진행해 주세요."
        confirmText="삭제"
        cancelText="취소"
        eventKey="admin-products-delete-confirm"
        eventMeta={{ productId: pendingDeleteProductId }}
      />
    </div>
  );
}
