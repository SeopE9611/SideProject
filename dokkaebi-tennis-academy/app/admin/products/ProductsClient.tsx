'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { PlusCircle, Search, Filter, ArrowUpDown, MoreHorizontal, Package, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ProductsLoading from '@/app/admin/products/loading';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { X, Calendar } from 'lucide-react'; // X 아이콘(검색어 지우기)만 실제 사용
import { cn } from '@/lib/utils';
import BrandFilter from '@/app/admin/products/product-filters/BrandFilter';
import MaterialFilter from '@/app/admin/products/product-filters/MaterialFilter';
import StockStatusFilter from '@/app/admin/products/product-filters/StockStatusFilter';

type Product = {
  _id: string;
  name: string;
  sku: string;
  brand: string;
  gauge: string;
  material: string;
  price: number;
  inventory?: { stock: number; lowStock?: number };
};

// 상태 매핑
const statusMap = {
  active: { label: '판매중', color: 'bg-emerald-100 text-emerald-800' },
  out_of_stock: { label: '품절', color: 'bg-red-100 text-red-800' },
  low_stock: { label: '재고 부족', color: 'bg-yellow-100 text-yellow-800' },
  draft: { label: '임시저장', color: 'bg-gray-100 text-gray-800' },
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
  const { data, error, isLoading, mutate } = useSWR<{ products: Product[] }>('/api/products?preview=0', fetcher);
  const debouncedTerm = useDebounce(searchTerm, 250);
  const products = data?.products ?? [];

  // 필터 옵션 상태
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
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

  if (isLoading) {
    return <ProductsLoading />;
  }
  if (error) {
    return <div className="text-center text-red-500">상품 로드 중 오류가 발생했습니다.</div>;
  }
  // UI 용 데이터 가공
  const strings = products.map((p) => {
    const stock = p.inventory?.stock ?? 0;
    let statusKey: keyof typeof statusMap = 'active';
    if (stock === 0) statusKey = 'out_of_stock';
    else if (p.inventory?.lowStock != null && stock <= p.inventory.lowStock) {
      statusKey = 'low_stock';
    }
    return {
      id: p._id,
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      gauge: p.gauge,
      material: p.material,
      price: p.price,
      stock,
      status: statusKey,
    };
  });

  // 필터 종류
  const brands = BRAND_OPTIONS.map((o) => o.id);
  const materials = MATERIAL_OPTIONS.map((o) => o.id);
  // 검색 필터링
  const term = debouncedTerm.trim().toLowerCase();
  const filtered = (term ? strings.filter((s) => [s.name, s.brand, s.sku].some((field) => field.toLowerCase().includes(term))) : strings)
    .filter((p) => brandFilter === 'all' || p.brand === brandFilter)
    .filter((p) => materialFilter === 'all' || p.material === materialFilter)
    .filter((p) => statusFilter === 'all' || p.status === statusFilter);

  // 필터 적용 여부
  const isFiltered = brandFilter !== 'all' || materialFilter !== 'all' || statusFilter !== 'all' || term.length > 0;

  // 전체 상품 목록 (원본 데이터)
  const totalAll = products.length;
  const activeAll = products.filter((p) => {
    const stock = p.inventory?.stock ?? 0;
    // stock > lowStock && stock > 0
    return stock > 0 && !(p.inventory?.lowStock != null && stock <= p.inventory.lowStock);
  }).length;
  const lowStockAll = products.filter((p) => {
    const stock = p.inventory?.stock ?? 0;
    return p.inventory?.lowStock != null && stock > 0 && stock <= p.inventory.lowStock;
  }).length;
  const outOfStockAll = products.filter((p) => (p.inventory?.stock ?? 0) === 0).length;

  // 목록 제목과 하단 카운트용 (검색 후)
  const totalFiltered = filtered.length;
  return (
    <div className="p-6 space-y-8">
      {/* 페이지 제목 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">상품 관리</h1>
            <p className="mt-2 text-lg text-gray-600">테니스 스트링 상품을 효율적으로 관리하세요</p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 상품</p>
                <p className="text-3xl font-bold text-gray-900">{totalAll}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">판매 중</p>
                <p className="text-3xl font-bold text-gray-900">{activeAll}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">재고 부족</p>
                <p className="text-3xl font-bold text-gray-900">{lowStockAll}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">품절</p>
                <p className="text-3xl font-bold text-gray-900">{outOfStockAll}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상품 관리 카드 */}
      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">스트링 목록</CardTitle>
              <CardDescription className="text-gray-600">
                {filtered.length > 0 ? `총 ${totalFiltered}개의 스트링이 검색되었습니다.` : products.length === 0 ? '등록된 스트링이 없습니다.' : '조건에 맞는 스트링이 없습니다. 필터를 초기화해 보세요.'}
              </CardDescription>
            </div>
            <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
              <Link href="/admin/products/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                스트링 등록
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-3 md:space-y-0">
            {/* <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input type="search" placeholder="스트링명, 브랜드, SKU로 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500" />
            </div> */}
            <div className="w-full space-y-3">
              {/* 검색 인풋 (좌측 아이콘 + 우측 X 버튼) */}
              <div className="w-full max-w-md">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="search" placeholder="스트링명, 브랜드, SKU로 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9 text-xs" />
                  {searchTerm && (
                    <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 필터 그리드  */}
              <div className="grid w-full gap-2 border-t pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <BrandFilter value={brandFilter} onChange={setBrandFilter} options={brands} />
                <MaterialFilter value={materialFilter} onChange={setMaterialFilter} options={materials} />
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
                  className="w-full"
                >
                  필터 초기화
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[65vh] rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-900">스트링명</TableHead>
                  <TableHead className="font-semibold text-gray-900">브랜드</TableHead>
                  <TableHead className="font-semibold text-gray-900">게이지</TableHead>
                  <TableHead className="font-semibold text-gray-900">재질</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">가격</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">재고</TableHead>
                  <TableHead className="font-semibold text-gray-900">상태</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="text-sm font-medium text-gray-900">{products.length === 0 ? '등록된 스트링이 없습니다.' : '조건에 맞는 스트링이 없습니다.'}</div>
                        <div className="text-xs text-muted-foreground">{products.length === 0 ? '새 스트링을 등록해 시작해 보세요.' : '필터를 초기화하거나 검색어를 수정해 보세요.'}</div>

                        <div className="mt-3 flex items-center gap-2">
                          {products.length === 0 ? (
                            <Button asChild size="sm">
                              <Link href="/admin/products/new">스트링 등록</Link>
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBrandFilter('all');
                                  setMaterialFilter('all');
                                  setStatusFilter('all');
                                  setSearchTerm('');
                                }}
                              >
                                필터 초기화
                              </Button>
                              {term && (
                                <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                                  검색어 지우기
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium">
                        <Link href={`/products/${s.id}`} className="hover:text-emerald-600">
                          <div className="space-y-1">
                            <div className="text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.sku}</div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>{brandLabel(s.brand)}</TableCell>
                      <TableCell>{s.gauge}</TableCell>
                      <TableCell>{materialLabel(s.material)}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{s.price.toLocaleString()}원</TableCell>
                      <TableCell className="text-right">{s.stock > 0 ? <span className="font-medium text-gray-900">{s.stock}</span> : <span className="font-medium text-red-600">품절</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusMap[s.status].color}>
                          {statusMap[s.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/products/${s.id}`}>상세 보기</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/${s.id}/edit`}>수정</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(s.id)}>
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
