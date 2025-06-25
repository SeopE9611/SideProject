import Link from 'next/link';
import { PlusCircle, Search, Filter, ArrowUpDown, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

// 스트링 상품 목록 데이터 (실제로는 API에서 가져올 것입니다)
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
  active: { label: '판매중', variant: 'default' },
  out_of_stock: { label: '품절', variant: 'destructive' },
  low_stock: { label: '재고 부족', variant: 'warning' },
  draft: { label: '임시저장', variant: 'secondary' },
};

export default async function ProductsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">스트링 상품 관리</h2>
          <p className="text-muted-foreground">테니스 스트링 상품을 관리하고 새로운 스트링을 등록하세요.</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            스트링 등록
          </Link>
        </Button>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>스트링 목록</CardTitle>
          <CardDescription>총 {strings.length}개의 스트링이 등록되어 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4 flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input placeholder="스트링명, 브랜드, SKU로 검색" className="h-9" type="search" />
              <Button variant="outline" size="sm" className="h-9 px-2 lg:px-3">
                <Search className="h-4 w-4" />
                <span className="ml-2 hidden lg:inline">검색</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="mr-2 h-4 w-4" />
                필터
              </Button>
              <Button variant="outline" size="sm" className="h-9">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                정렬
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>스트링명</TableHead>
                  <TableHead>브랜드</TableHead>
                  <TableHead>게이지</TableHead>
                  <TableHead>재질</TableHead>
                  <TableHead className="text-right">가격</TableHead>
                  <TableHead className="text-right">재고</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strings.map((string) => (
                  <TableRow key={string.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/products/${string.id}`} className="hover:underline">
                        {string.name}
                      </Link>
                    </TableCell>
                    <TableCell>{string.brand}</TableCell>
                    <TableCell>{string.gauge}</TableCell>
                    <TableCell>{string.material}</TableCell>
                    <TableCell className="text-right">{string.price.toLocaleString()}원</TableCell>
                    <TableCell className="text-right">{string.stock > 0 ? string.stock : <span className="text-red-500">품절</span>}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[string.status as keyof typeof statusMap].variant as any}>{statusMap[string.status as keyof typeof statusMap].label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">메뉴 열기</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>작업</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${string.id}`}>상세 보기</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${string.id}/edit`}>수정</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">삭제</DropdownMenuItem>
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
