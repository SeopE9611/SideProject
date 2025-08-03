import Link from 'next/link';
import { PlusCircle, Search, Filter, ArrowUpDown, MoreHorizontal, Package, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// 스트링 상품 목록 더미 데이터
const strings = [
  {
    id: '1',
    name: '루키론 프로 스트링',
    sku: 'STR-LUX-001',
    brand: '루키론',
    gauge: '1.25mm (16G)',
    material: '폴리에스터',
    price: 25000,
    stock: 15,
    status: 'active',
    features: {
      power: 4,
      control: 3,
      spin: 3,
      durability: 5,
    },
  },
  {
    id: '2',
    name: '테크니파이버 블랙코드',
    sku: 'STR-TEC-002',
    brand: '테크니파이버',
    gauge: '1.28mm (16L)',
    material: '폴리에스터',
    price: 32000,
    stock: 8,
    status: 'active',
    features: {
      power: 3,
      control: 4,
      spin: 5,
      durability: 4,
    },
  },
  {
    id: '3',
    name: '윌슨 NXT 파워',
    sku: 'STR-WIL-003',
    brand: '윌슨',
    gauge: '1.30mm (16)',
    material: '멀티필라멘트',
    price: 28000,
    stock: 0,
    status: 'out_of_stock',
    features: {
      power: 5,
      control: 3,
      spin: 2,
      durability: 3,
    },
  },
  {
    id: '4',
    name: '바볼랏 RPM 블라스트',
    sku: 'STR-BAB-004',
    brand: '바볼랏',
    gauge: '1.25mm (16G)',
    material: '폴리에스터',
    price: 30000,
    stock: 3,
    status: 'low_stock',
    features: {
      power: 3,
      control: 4,
      spin: 5,
      durability: 4,
    },
  },
  {
    id: '5',
    name: '헤드 링키 스트링',
    sku: 'STR-HEA-005',
    brand: '헤드',
    gauge: '1.30mm (16)',
    material: '폴리에스터',
    price: 22000,
    stock: 20,
    status: 'active',
    features: {
      power: 4,
      control: 3,
      spin: 4,
      durability: 3,
    },
  },
  {
    id: '6',
    name: '요넥스 폴리투어 프로',
    sku: 'STR-YON-006',
    brand: '요넥스',
    gauge: '1.25mm (16G)',
    material: '폴리에스터',
    price: 35000,
    stock: 12,
    status: 'active',
    features: {
      power: 3,
      control: 5,
      spin: 4,
      durability: 5,
    },
  },
  {
    id: '7',
    name: '소링크 투어바이트',
    sku: 'STR-SOL-007',
    brand: '소링크',
    gauge: '1.25mm (16G)',
    material: '폴리에스터',
    price: 27000,
    stock: 5,
    status: 'low_stock',
    features: {
      power: 4,
      control: 4,
      spin: 4,
      durability: 4,
    },
  },
  {
    id: '8',
    name: '던롭 익스플로전',
    sku: 'STR-DUN-008',
    brand: '던롭',
    gauge: '1.30mm (16)',
    material: '멀티필라멘트',
    price: 26000,
    stock: 18,
    status: 'active',
    features: {
      power: 5,
      control: 3,
      spin: 3,
      durability: 3,
    },
  },
];

// 상품 상태에 따른 배지 색상 및 텍스트
const statusMap = {
  active: { label: '판매중', variant: 'default', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
  out_of_stock: { label: '품절', variant: 'destructive', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
  low_stock: { label: '재고 부족', variant: 'warning', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  draft: { label: '임시저장', variant: 'secondary', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
};

export default async function ProductsPage() {
  // 통계 계산
  const totalProducts = strings.length;
  const activeProducts = strings.filter((s) => s.status === 'active').length;
  const outOfStockProducts = strings.filter((s) => s.status === 'out_of_stock').length;
  const lowStockProducts = strings.filter((s) => s.status === 'low_stock').length;

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
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 상품</p>
                <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">판매 중</p>
                <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">재고 부족</p>
                <p className="text-3xl font-bold text-gray-900">{lowStockProducts}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">품절</p>
                <p className="text-3xl font-bold text-gray-900">{outOfStockProducts}</p>
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
              <CardDescription className="text-gray-600">총 {strings.length}개의 스트링이 등록되어 있습니다.</CardDescription>
            </div>
            <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg">
              <Link href="/admin/products/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                스트링 등록
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="mb-4 flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input placeholder="스트링명, 브랜드, SKU로 검색" className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500" type="search" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent">
                <Filter className="mr-2 h-4 w-4" />
                필터
              </Button>
              <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                정렬
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
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
                {strings.map((string) => (
                  <TableRow key={string.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <Link href={`/admin/products/${string.id}`} className="hover:text-emerald-600 transition-colors">
                        <div className="space-y-1">
                          <div className="text-gray-900">{string.name}</div>
                          <div className="text-xs text-gray-500">{string.sku}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-700">{string.brand}</TableCell>
                    <TableCell className="text-gray-700">{string.gauge}</TableCell>
                    <TableCell className="text-gray-700">{string.material}</TableCell>
                    <TableCell className="text-right font-medium text-gray-900">{string.price.toLocaleString()}원</TableCell>
                    <TableCell className="text-right">{string.stock > 0 ? <span className="font-medium text-gray-900">{string.stock}</span> : <span className="font-medium text-red-600">품절</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusMap[string.status as keyof typeof statusMap].color}>
                        {statusMap[string.status as keyof typeof statusMap].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <span className="sr-only">메뉴 열기</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>작업</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={`/admin/products/${string.id}`}>상세 보기</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={`/admin/products/${string.id}/edit`}>수정</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 cursor-pointer">삭제</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
