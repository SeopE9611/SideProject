'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ApiResponse, OrderWithType } from '@/lib/types/order';
import { ArrowUpDown, ChevronDown, Copy, Download, Eye, Filter, MoreHorizontal, Search, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { shortenId } from '@/lib/shorten';
import { toast } from 'sonner';
import { getShippingBadge, orderStatusColors, orderTypeColors, paymentStatusColors, shippingStatusColors } from '@/lib/badge-style';
import CustomerTypeFilter from '@/app/admin/orders/_components/order-filters/CustomerTypeFilter';
import { OrderStatusFilter } from '@/app/admin/orders/_components/order-filters/OrderStatusFilter';
import { PaymentStatusFilter } from '@/app/admin/orders/_components/order-filters/PaymentStatusFilter';
import { ShippingStatusFilter } from '@/app/admin/orders/_components/order-filters/ShippingStatusFilter';
import { OrderTypeFilter } from '@/app/admin/orders/_components/order-filters/OrderTypeFilter';
import { cn } from '@/lib/utils';
import { DateFilter } from '@/app/admin/orders/_components/order-filters/DateFilter';
import AuthGuard from '@/components/auth/AuthGuard';
import { useRouter } from 'next/navigation';
import { showErrorToast } from '@/lib/toast';
import ApplicationStatusBadge from '@/app/admin/applications/_components/ApplicationStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

/** 데이터를 받아오는 fetcher 함수 */
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function OrdersClient() {
  const router = useRouter();

  // 현재 페이지 번호 상태
  const [page, setPage] = useState(1);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 필터 상태들
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [shippingFilter, setShippingFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');

  // 고급 검색 토글 상태
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 정렬 상태
  const [sortBy, setSortBy] = useState<'customer' | 'date' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 날짜 필터 상태
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  // SWR 훅: 서버 사이드 페이징을 위해 page, limit 쿼리 포함
  const { data, error } = useSWR<ApiResponse>(`/api/orders?page=${page}&limit=${limit}`, fetcher);

  // 데이터 준비: data.items, data.total
  const orders = data?.items ?? []; // 현재 페이지 항목 배열
  const totalPages = data?.total
    ? Math.ceil(data.total / limit) // 전체 페이지 수
    : 0;

  // 검색 / 필터링 로직
  const filteredOrders = orders.filter((order) => {
    // 검색어 매치: ID, 고객명, 이메일
    const searchMatch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    // 상태 필터 매치
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const typeMatch = typeFilter === 'all' || order.type === typeFilter;
    const paymentMatch = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

    // 고객 유형 필터: 회원/비회원
    const customerTypeMatch = customerTypeFilter === 'all' || (customerTypeFilter === 'member' && order.userId) || (customerTypeFilter === 'guest' && !order.userId);

    // 운송장 상태 필터
    const shippingMatch = shippingFilter === 'all' || getShippingBadge(order).label === shippingFilter;

    // 날짜 필터
    const matchDate = !selectedDate || new Date(order.date).toDateString() === selectedDate.toDateString();

    return searchMatch && statusMatch && typeMatch && paymentMatch && shippingMatch && customerTypeMatch && matchDate;
  });

  // 정렬 로직
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortBy) return 0;
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortBy) {
      case 'customer':
        aValue = a.customer.name.toLowerCase();
        bValue = b.customer.name.toLowerCase();
        break;
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'total':
        aValue = a.total;
        bValue = b.total;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 유틸리티 함수

  // 비회원 vs 탈퇴회원 표시
  function getDisplayUserType(order: OrderWithType) {
    if (order.customer.name.includes('(탈퇴한 회원)')) return '(탈퇴한 회원)';
    return '';
  }

  // 날짜 포맷터
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 필터 리셋
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPaymentFilter('all');
    setShippingFilter('all');
    setCustomerTypeFilter('all');
    setSelectedDate(undefined);
  };

  // 정렬 헤더 클릭 핸들러
  const handleSort = (key: 'customer' | 'date' | 'total') => {
    if (sortBy === key) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  // 배송정보 업데이트 네비게이션
  const handleShippingUpdate = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        toast.error('주문 정보를 불러올 수 없습니다.');
        return;
      }
      const order = await res.json();
      if (['취소', '결제취소'].includes(order.status)) {
        showErrorToast('취소된 주문은 배송 정보를 등록할 수 없습니다.');
        return;
      }
      router.push(`/admin/orders/${orderId}/shipping-update`);
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <AuthGuard>
      <div className="container py-6">
        {/* 제목 및 설명 */}
        <div className="mx-auto max-w-7xl mb-5">
          <h1 className="text-4xl font-semibold tracking-tight">주문 관리</h1>
          <p className="mt-1 text-xs text-muted-foreground">도깨비 테니스 아카데미의 모든 주문을 관리하고 처리하세요.</p>
        </div>

        {/* 필터 및 검색 카드 */}
        <Card className="mb-5 rounded-xl border-gray-200 bg-white shadow-md px-6 py-5">
          <CardHeader className="pb-3">
            <CardTitle>필터 및 검색</CardTitle>
            <CardDescription className="text-xs">주문 상태, 유형, 결제 상태로 필터링하거나 주문 ID, 고객명, 이메일로 검색하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* 검색 input */}
              <div className="w-full max-w-md">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="search" placeholder="주문 ID, 고객명, 이메일 검색..." className="pl-8 text-xs h-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  {searchTerm && (
                    <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 필터 컴포넌트들 */}
              <div className="grid w-full gap-2 border-t pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <CustomerTypeFilter value={customerTypeFilter} onChange={setCustomerTypeFilter} />
                <OrderStatusFilter value={statusFilter} onChange={setStatusFilter} />
                <PaymentStatusFilter value={paymentFilter} onChange={setPaymentFilter} />
                <ShippingStatusFilter value={shippingFilter} onChange={setShippingFilter} />
                <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
                <Button variant="outline" size="sm" onClick={resetFilters} className="w-full">
                  필터 초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 목록 테이블 */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-md px-4 py-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              {data ? (
                <>
                  <CardTitle className="text-base font-medium">주문 목록</CardTitle>
                  <p className="text-xs text-muted-foreground">총 {data.total}개의 주문</p>
                </>
              ) : (
                <>
                  <Skeleton className="h-5 w-24 rounded bg-gray-200" />
                  <Skeleton className="h-4 w-36 rounded bg-gray-100" />
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto overflow-visible">
            <Table className="min-w-full text-xs whitespace-nowrap border border-border">
              <TableHeader>
                <TableRow className="rounded-xl">
                  <TableHead className="text-center w-[140px]">주문 ID</TableHead>
                  <TableHead onClick={() => handleSort('customer')} className={cn('text-center cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'customer' && 'text-primary')}>
                    고객
                    <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'customer' && sortDirection === 'desc' && 'rotate-180')} />
                  </TableHead>
                  <TableHead className="relative whitespace-nowrap overflow-visible">
                    <div className="flex items-center justify-center gap-2">
                      <span onClick={() => handleSort('date')} className={cn('flex items-center gap-1 cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'date' && 'text-primary')}>
                        날짜
                        <ChevronDown className={cn('w-3 h-3 transition-transform', sortBy === 'date' && sortDirection === 'desc' && 'rotate-180')} />
                      </span>
                      <DateFilter date={selectedDate} onChange={setSelectedDate} />
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-[80px]">상태</TableHead>
                  <TableHead className="text-center w-[80px]">결제</TableHead>
                  <TableHead className="text-center w-[90px]">운송장</TableHead>
                  <TableHead className="text-center w-[70px]">유형</TableHead>
                  <TableHead onClick={() => handleSort('total')} className={cn('text-right cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'total' && 'text-primary')}>
                    금액
                    <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'total' && sortDirection === 'desc' && 'rotate-180')} />
                  </TableHead>
                  <TableHead className="text-center w-[40px]">...</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  // 에러: 한 줄만 에러 메시지
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-red-500">
                      주문 데이터를 불러오는 중 오류가 발생했습니다.
                    </TableCell>
                  </TableRow>
                ) : !data ? (
                  // 로딩: limit 개수만큼 스켈레톤 행 렌더
                  Array.from({ length: limit }).map((_, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {Array.from({ length: 9 }).map((_, cellIdx) => (
                        <TableCell key={cellIdx}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      불러올 주문이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : sortedOrders.length === 0 ? (
                  // 빈 결과
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                      {/* 주문 ID 셀 Tooltip */}
                      <TableCell className="text-center py-2 px-4">
                        <TooltipProvider delayDuration={10}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block max-w-[160px] truncate cursor-pointer">{shortenId(order.id)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center" sideOffset={6} className="z-50 ml-12 bg-white px-5 py-2.5 rounded-lg shadow-lg border text-base min-w-[240px]">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{order.id}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.id);
                                    toast.success('주문 ID가 클립보드에 복사되었습니다.');
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                  <span className="sr-only">복사</span>
                                </Button>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* 고객 정보 셀 */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span>
                            {order.customer.name ? (
                              <>
                                {order.customer.name.replace(' (탈퇴한 회원)', '')}
                                {getDisplayUserType(order) && <span className="ml-1 text-[10px] text-muted-foreground">{getDisplayUserType(order)}</span>}
                              </>
                            ) : (
                              <span className="text-red-500 text-xs">(고객 정보 없음)</span>
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{order.customer.email}</span>
                        </div>
                      </TableCell>

                      {/* 날짜 셀 */}
                      <TableCell className="text-center">{formatDate(order.date)}</TableCell>

                      {/* 상태(Status) 셀 */}
                      <TableCell className="text-center">
                        {order.__type === 'stringing_application' ? <ApplicationStatusBadge status={order.status} /> : <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${orderStatusColors[order.status]}`}>{order.status}</Badge>}
                      </TableCell>

                      {/* 결제 상태 셀 */}
                      <TableCell className="text-center">
                        <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${paymentStatusColors[order.paymentStatus]}`}>{order.paymentStatus}</Badge>
                      </TableCell>

                      {/* 운송장 셀 */}
                      <TableCell className="text-center">
                        {(() => {
                          const { label, color } = getShippingBadge(order);
                          return <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${color}`}>{label}</Badge>;
                        })()}
                      </TableCell>

                      {/* 유형(Type) 셀 */}
                      <TableCell className="text-center">
                        <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${order.__type === 'stringing_application' ? orderTypeColors['서비스'] : orderTypeColors['상품']}`}>{order.type}</Badge>
                      </TableCell>

                      {/* 금액 셀 */}
                      <TableCell className="text-center font-medium">{formatCurrency(order.total)}</TableCell>

                      {/* 작업 메뉴 셀 */}
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/orders/${order.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> 상세 보기
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleShippingUpdate(order.id)}>
                              <Truck className="mr-2 h-4 w-4" /> 배송 정보 등록
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* 페이지네이션 */}
            <div className="mt-4 flex justify-end space-x-2">
              <Button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} variant="outline">
                이전
              </Button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <Button key={idx} onClick={() => setPage(idx + 1)} variant={page === idx + 1 ? 'default' : 'outline'} size="sm">
                  {idx + 1}
                </Button>
              ))}
              <Button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} variant="outline">
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
