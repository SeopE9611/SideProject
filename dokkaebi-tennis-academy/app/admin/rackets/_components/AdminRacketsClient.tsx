'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Package, Search, MoreVertical, Edit, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MdSportsTennis } from 'react-icons/md';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { racketBrandLabel } from '@/lib/constants';
import { adminFetcher, getAdminErrorMessage } from '@/lib/admin/adminFetcher';

function StockChip({ id, total }: { id: string; total: number }) {
  const { data } = useSWR<{ ok: boolean; available: number }>(`/api/admin/rentals/active-count/${id}`, adminFetcher, { dedupingInterval: 5000 });
  const qty = Math.max(1, total ?? 1);
  const avail = Math.max(0, Number(data?.available ?? 0));
  const soldOut = avail <= 0;
  return (
    <Badge variant={soldOut ? 'destructive' : 'default'} className="font-normal">
      {qty > 1 ? (soldOut ? `0/${qty}` : `${avail}/${qty}`) : soldOut ? '대여 중' : '대여 가능'}
    </Badge>
  );
}

type Item = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: 'A' | 'B' | 'C';
  status: 'available' | 'rented' | 'sold' | 'inactive';
  rental?: { enabled: boolean; deposit: number; fee: { d7: number; d15: number; d30: number } };
  images?: string[];
  quantity?: number;
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    available: { label: '판매가능', variant: 'default' },
    rented: { label: '대여중', variant: 'secondary' },
    sold: { label: '판매완료', variant: 'destructive' },
    inactive: { label: '비노출', variant: 'outline' },
  };
  const config = variants[status] || { label: status, variant: 'outline' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function ConditionBadge({ condition }: { condition: string }) {
  const labels: Record<string, string> = {
    A: 'A급 (최상)',
    B: 'B급 (양호)',
    C: 'C급 (보통)',
  };
  return <Badge variant="outline">{labels[condition] || condition}</Badge>;
}

export default function AdminRacketsClient() {
  const { data, isLoading, error } = useSWR<{ items: Item[]; total: number; page: number; pageSize: number }>('/api/admin/rackets?page=1&pageSize=50', adminFetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');

  const items = data?.items ?? [];
  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;
  const filteredItems = useMemo(() => {
    if (!items.length) return [];

    return items.filter((item) => {
      const matchesSearch = item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || item.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;

      return matchesSearch && matchesStatus && matchesCondition;
    });
  }, [items, searchQuery, statusFilter, conditionFilter]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const available = filteredItems.filter((item) => item.status === 'available').length;
    const rented = filteredItems.filter((item) => item.status === 'rented').length;
    const sold = filteredItems.filter((item) => item.status === 'sold').length;
    return { total, available, rented, sold };
  }, [filteredItems]);

  return (
    <div className={['min-h-screen', 'bg-gradient-to-b from-slate-50 via-white to-slate-50', 'dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'].join(' ')}>
      <div className="container py-8 px-6">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-card dark:bg-card rounded-full p-3 shadow-md">
              <MdSportsTennis className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">중고 라켓 관리</h1>
              <p className="mt-2 text-base text-muted-foreground dark:text-muted-foreground">중고 라켓 재고를 효율적으로 관리하세요</p>
            </div>
          </div>
        </div>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 shrink-0">
          {[
            {
              label: '전체 라켓',
              icon: <Package className="h-6 w-6 text-primary" />,
              value: stats.total,
              bgColor: 'bg-primary dark:bg-primary',
            },
            {
              label: '판매 가능',
              icon: <CheckCircle className="h-6 w-6 text-green-600" />,
              value: stats.available,
              bgColor: 'bg-green-50 dark:bg-green-950/20',
            },
            {
              label: '대여 중',
              icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
              value: stats.rented,
              bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
            },
            {
              label: '판매 완료',
              icon: <XCircle className="h-6 w-6 text-rose-600" />,
              value: stats.sold,
              bgColor: 'bg-rose-50 dark:bg-rose-950/20',
            },
          ].map((c, i) => (
            <Card key={i} className="shadow-xl bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-900 dark:to-emerald-950/20 border border-border dark:border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">{c.label}</p>
                    <p className="text-3xl font-bold text-foreground">{isLoading && !data ? <span className="inline-block h-7 w-12 rounded bg-primary dark:bg-primary animate-pulse align-middle" /> : c.value}</p>
                  </div>
                  <div className={`${c.bgColor} rounded-xl p-3 border border-border dark:border-border`}>{c.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="shadow-xl bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-900 dark:to-emerald-950/20 border border-border dark:border-border flex-1 min-h-0 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-border dark:border-border pb-4 shrink-0">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-xl font-semibold text-primary dark:text-primary">라켓 목록</CardTitle>
                <CardDescription className="text-primary dark:text-primary">
                  {filteredItems.length > 0 ? `총 ${filteredItems.length}개의 라켓이 검색되었습니다.` : isLoading ? '목록을 불러오는 중…' : '조건에 맞는 라켓이 없습니다.'}
                </CardDescription>
              </div>
              <Button
                asChild
                className={[
                  'h-9 px-4 rounded-lg font-medium inline-flex items-center gap-2',
                  'bg-primary hover:bg-primary text-primary-foreground',
                  'dark:bg-primary dark:hover:bg-primary',
                  'border border-white/10 dark:border-white/10 shadow-sm hover:shadow',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                  'ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900',
                  'transition-colors',
                ].join(' ')}
              >
                <Link href="/admin/rackets/new">
                  <Plus className="mr-2 h-4 w-4" />
                  라켓 등록
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 flex-1 min-h-0 flex flex-col p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-3 md:space-y-0">
              <div className="w-full space-y-3">
                <div className="w-full max-w-md">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="브랜드, 모델 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs border-border focus:border-border dark:border-border dark:focus:border-border bg-card dark:bg-card"
                    />
                  </div>
                </div>

                <div className="grid w-full gap-2 border-t border-border dark:border-border pt-3 sm:grid-cols-2 md:grid-cols-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-border dark:border-border">
                      <SelectValue placeholder="상태 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="available">판매가능</SelectItem>
                      <SelectItem value="rented">대여중</SelectItem>
                      <SelectItem value="sold">판매완료</SelectItem>
                      <SelectItem value="inactive">비노출</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger className="border-border dark:border-border">
                      <SelectValue placeholder="등급 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 등급</SelectItem>
                      <SelectItem value="A">A급 (최상)</SelectItem>
                      <SelectItem value="B">B급 (양호)</SelectItem>
                      <SelectItem value="C">C급 (보통)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setConditionFilter('all');
                    }}
                    className="w-full border-border hover:bg-primary dark:border-border dark:hover:bg-card"
                  >
                    필터 초기화
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1">
              {isLoading ? (
                <div className="overflow-auto rounded-lg border border-border dark:border-border">
                  <div className="space-y-4 p-8">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-primary dark:bg-primary rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : commonErrorMessage ? (
                <div className="overflow-auto rounded-lg border border-destructive dark:border-destructive">
                  <div className="p-8 text-center">
                    <p className="text-destructive dark:text-destructive">{commonErrorMessage}</p>
                  </div>
                </div>
              ) : !filteredItems.length ? (
                <div className="overflow-auto rounded-lg border border-border dark:border-border">
                  <div className="p-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="text-sm font-medium text-foreground">조건에 맞는 라켓이 없습니다.</div>
                    <div className="text-xs text-muted-foreground mt-2">필터를 초기화하거나 검색어를 수정해 보세요.</div>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto rounded-lg border border-border dark:border-border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 backdrop-blur bg-primary supports-[backdrop-filter]:bg-primary dark:bg-card dark:supports-[backdrop-filter]:bg-card border-b border-border dark:border-border">
                      <TableRow className="border-b border-border dark:border-border">
                        <TableHead className="text-left text-primary dark:text-primary">라켓 정보</TableHead>
                        <TableHead className="text-right text-primary dark:text-primary">가격</TableHead>
                        <TableHead className="text-center text-primary dark:text-primary">등급</TableHead>
                        <TableHead className="text-center text-primary dark:text-primary">상태</TableHead>
                        <TableHead className="text-center text-primary dark:text-primary">대여</TableHead>
                        <TableHead className="text-center text-primary dark:text-primary">재고</TableHead>
                        <TableHead className="text-right text-primary dark:text-primary">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="border-b border-border last:border-b-0 dark:border-border hover:bg-primary dark:hover:bg-card even:bg-primary dark:even:bg-card transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {item.images?.[0] && <img src={item.images[0] || '/placeholder.svg'} alt={item.model} className="h-12 w-12 rounded-lg object-cover" />}
                              <div>
                                <div className="font-semibold text-foreground dark:text-white">{racketBrandLabel(item.brand)}</div>
                                <div className="text-sm text-muted-foreground dark:text-muted-foreground">{item.model}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-foreground dark:text-white">{item.price?.toLocaleString()}원</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <ConditionBadge condition={item.condition} />
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.rental?.enabled ? 'default' : 'outline'}>{item.rental?.enabled ? '가능' : '불가'}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <StockChip id={item.id} total={item.quantity ?? 1} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 hover:bg-primary dark:hover:bg-primary">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="border-border dark:border-border">
                                <DropdownMenuLabel>작업</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/rackets/${item.id}`} className="flex items-center">
                                    <Eye className="h-4 w-4 mr-2" />
                                    상세 보기
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/rackets/${item.id}/edit`} className="flex items-center">
                                    <Edit className="h-4 w-4 mr-2" />
                                    수정
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
