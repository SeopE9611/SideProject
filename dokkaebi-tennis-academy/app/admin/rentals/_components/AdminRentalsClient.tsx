'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { ChevronDown, Copy, Eye, MoreHorizontal, Package, Search, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { badgeBase, badgeSizeSm } from '@/lib/badge-style';
import { shortenId } from '@/lib/shorten';
import CleanupCreatedButton from '@/app/admin/rentals/_components/CleanupCreatedButton';

type RentalRow = {
  id: string;
  brand: string;
  model: string;
  status: 'created' | 'paid' | 'out' | 'returned' | 'canceled';
  days: number;
  amount: { fee: number; deposit: number; total: number };
  dueAt?: string;
  depositRefundedAt?: string;
  customer?: {
    name: string;
    email: string;
  };
  createdAt?: string;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

const rentalStatusColors: Record<string, string> = {
  created: 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20',
  paid: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
  out: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20',
  returned: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
  canceled: 'bg-red-500/10 text-red-500 dark:bg-red-500/20',
};

const rentalStatusLabels: Record<string, string> = {
  created: '생성됨',
  paid: '결제완료',
  out: '대여중',
  returned: '반납완료',
  canceled: '취소됨',
};

export default function AdminRentalsClient() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'customer' | 'date' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const pageSize = 20;

  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (brand) qs.set('brand', brand);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  const key = `/api/admin/rentals?${qs.toString()}`;

  const { data, isLoading, mutate } = useSWR<{ items: RentalRow[]; total: number }>(key, fetcher);

  const filteredRentals = (data?.items ?? []).filter((rental) => {
    const searchMatch =
      rental.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customer?.email.toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  const sortedRentals = [...filteredRentals].sort((a, b) => {
    if (!sortBy) return 0;
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortBy) {
      case 'customer':
        aValue = (a.customer?.name || '').toLowerCase();
        bValue = (b.customer?.name || '').toLowerCase();
        break;
      case 'date':
        aValue = new Date(a.createdAt || 0).getTime();
        bValue = new Date(b.createdAt || 0).getTime();
        break;
      case 'total':
        aValue = a.amount.total;
        bValue = b.amount.total;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const markRefund = async (id: string, mark: boolean) => {
    if (busyId) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/rentals/${encodeURIComponent(id)}/deposit/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: mark ? 'mark' : 'clear' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      showErrorToast(json?.message || '처리 실패');
      setBusyId(null);
      return;
    }
    await mutate();
    showSuccessToast(mark ? '환불 처리 완료' : '환불 해제 완료');
    setBusyId(null);
  };

  const onReturn = async (id?: string) => {
    const safe = (id ?? '').trim();
    if (!safe) {
      showErrorToast('유효하지 않은 대여 ID입니다.');
      return;
    }
    if (!confirm('반납 처리하시겠어요?')) return;
    const res = await fetch(`/api/rentals/${encodeURIComponent(safe)}/return`, { method: 'POST' });

    if (res.ok) {
      mutate();
      showSuccessToast('반납 처리 완료');
    } else showErrorToast('반납 처리 실패');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatus('');
    setBrand('');
    setFrom('');
    setTo('');
  };

  const handleSort = (key: 'customer' | 'date' | 'total') => {
    if (sortBy === key) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString));

  function getPaginationItems(page: number, totalPages: number, delta = 2): (number | string)[] {
    if (totalPages <= 1) return [1];
    const items: (number | string)[] = [1];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    if (left > 2) items.push('dots-left');
    for (let i = left; i <= right; i++) items.push(i);
    if (right < totalPages - 1) items.push('dots-right');
    items.push(totalPages);
    return items;
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const thClasses = 'px-4 py-2 text-center align-middle border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300';
  const tdClasses = 'px-3 py-4 align-middle text-center';

  return (
    <div className="container py-6">
      <div className="mx-auto max-w-7xl mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">대여 관리</h1>
            <p className="mt-1 text-xs text-muted-foreground">도깨비 테니스 아카데미의 모든 라켓 대여를 관리하고 처리하세요.</p>
          </div>
          {/* 유지보수: created 청소 버튼 */}
          <CleanupCreatedButton hours={2} />
        </div>
      </div>

      <Card className="mb-5 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-md px-6 py-5">
        <CardHeader className="pb-3">
          <CardTitle>필터 및 검색</CardTitle>
          <CardDescription className="text-xs">대여 상태, 브랜드, 날짜로 필터링하거나 대여 ID, 고객명, 이메일로 검색하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="search" placeholder="대여 ID, 고객명, 이메일, 브랜드, 모델 검색..." className="pl-8 text-xs h-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && (
                  <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid w-full gap-2 border-t pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">상태(전체)</option>
                <option value="created">생성됨</option>
                <option value="paid">결제완료</option>
                <option value="out">대여중</option>
                <option value="returned">반납완료</option>
                <option value="canceled">취소됨</option>
              </select>
              <Input
                placeholder="브랜드"
                className="h-9 text-xs"
                value={brand}
                onChange={(e) => {
                  setPage(1);
                  setBrand(e.target.value);
                }}
              />
              <Input
                type="date"
                className="h-9 text-xs"
                value={from}
                onChange={(e) => {
                  setPage(1);
                  setFrom(e.target.value);
                }}
              />
              <Input
                type="date"
                className="h-9 text-xs"
                value={to}
                onChange={(e) => {
                  setPage(1);
                  setTo(e.target.value);
                }}
              />
              <Button variant="outline" size="sm" onClick={resetFilters} className="w-full bg-transparent">
                필터 초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-md px-4 py-5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {data ? (
              <>
                <CardTitle className="text-base font-medium">대여 목록</CardTitle>
                <p className="text-xs text-muted-foreground">총 {data.total}개의 대여</p>
              </>
            ) : (
              <>
                <Skeleton className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-36 rounded bg-gray-100 dark:bg-gray-600" />
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto md:overflow-x-visible scrollbar-hidden relative pr-2 md:pr-0">
          <Table className="w-full table-auto border-separate [border-spacing-block:0.5rem] [border-spacing-inline:0] text-xs">
            <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-900 shadow-sm">
              <TableRow>
                <TableHead className={cn(thClasses, 'w-[140px]')}>대여 ID</TableHead>
                <TableHead onClick={() => handleSort('customer')} className={cn(thClasses, 'text-center cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'customer' && 'text-primary')}>
                  고객
                  <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 dark:text-gray-600 transition-transform', sortBy === 'customer' && sortDirection === 'desc' && 'rotate-180')} />
                </TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>라켓</TableHead>
                <TableHead onClick={() => handleSort('date')} className={cn(thClasses, 'w-36 cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'date' && 'text-primary')}>
                  대여일
                  <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 dark:text-gray-600 transition-transform', sortBy === 'date' && sortDirection === 'desc' && 'rotate-180')} />
                </TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>기간</TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>상태</TableHead>
                <TableHead onClick={() => handleSort('total')} className={cn(thClasses, 'text-center cursor-pointer select-none', sortBy === 'total' && 'text-primary')}>
                  금액
                  <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 dark:text-gray-600 transition-transform', sortBy === 'total' && sortDirection === 'desc' && 'rotate-180')} />
                </TableHead>
                <TableHead className={cn(thClasses, 'text-center')}>…</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {Array.from({ length: 8 }).map((_, cellIdx) => (
                      <TableCell key={cellIdx}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className={tdClasses}>
                    불러올 대여가 없습니다.
                  </TableCell>
                </TableRow>
              ) : sortedRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className={tdClasses}>
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRentals.map((r, idx) => {
                  const rid = r.id ?? (r as any)._id ?? '';
                  return (
                    <TableRow key={rid || `row-${idx}`} className="hover:bg-muted/50 transition-colors">
                      <TableCell className={cn(tdClasses, 'pl-6')}>
                        <TooltipProvider delayDuration={10}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block max-w-[140px] truncate cursor-pointer">{shortenId(rid)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center" sideOffset={6} className="px-5 py-2.5 rounded-lg shadow-lg border text-base min-w-[240px]">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{rid}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(rid);
                                    showSuccessToast('대여 ID가 클립보드에 복사되었습니다.');
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        <div className="flex flex-col items-center">
                          <span>{r.customer?.name || '-'}</span>
                          <span className="text-[11px] text-muted-foreground">{r.customer?.email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        {rid ? (
                          <Link href={`/admin/rentals/${rid}`} className="underline-offset-2 hover:underline font-medium">
                            {r.brand} {r.model}
                          </Link>
                        ) : (
                          <span>
                            {r.brand} {r.model}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-36 truncate whitespace-nowrap">{r.createdAt ? formatDate(r.createdAt) : '-'}</TableCell>
                      <TableCell className={tdClasses}>{r.days}일</TableCell>
                      <TableCell className={tdClasses}>
                        <Badge className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', rentalStatusColors[r.status])}>{rentalStatusLabels[r.status] || r.status}</Badge>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{won(r.amount.total)}</span>
                          <span className="text-[10px] text-muted-foreground">
                            수수료: {won(r.amount.fee)} / 보증금: {won(r.amount.deposit)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={tdClasses}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/rentals/${rid}`}>
                                <Eye className="mr-2 h-4 w-4" /> 상세 보기
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(r.status === 'paid' || r.status === 'out') && (
                              <DropdownMenuItem onClick={() => onReturn(rid)} disabled={busyId === rid}>
                                <Package className="mr-2 h-4 w-4" /> 반납 처리
                              </DropdownMenuItem>
                            )}
                            {r.status === 'returned' && (
                              <>
                                {r.depositRefundedAt ? (
                                  <DropdownMenuItem onClick={() => markRefund(rid, false)} disabled={busyId === rid}>
                                    <Truck className="mr-2 h-4 w-4" /> 환불 해제
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => markRefund(rid, true)} disabled={busyId === rid}>
                                    <Truck className="mr-2 h-4 w-4" /> 환불 처리
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-1 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                이전
              </Button>
              {getPaginationItems(page, totalPages).map((it, idx) =>
                typeof it === 'number' ? (
                  <Button key={`page-${it}`} size="sm" variant={it === page ? 'default' : 'outline'} onClick={() => setPage(it)}>
                    {it}
                  </Button>
                ) : (
                  <span key={`dots-${idx}`} className="px-2 text-muted-foreground">
                    …
                  </span>
                )
              )}
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
