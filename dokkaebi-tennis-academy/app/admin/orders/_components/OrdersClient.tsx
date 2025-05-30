'use client';

import { useEffect, useState } from 'react';
import { Order } from '@/lib/types/order';
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
import useSWR from 'swr';
import { orderStatusColors, orderTypeColors, paymentStatusColors, shippingStatusColors } from '@/lib/badge-style';
import CustomerTypeFilter from '@/app/admin/orders/_components/order-filters/CustomerTypeFilter';
import { OrderStatusFilter } from '@/app/admin/orders/_components/order-filters/OrderStatusFilter';
import { PaymentStatusFilter } from '@/app/admin/orders/_components/order-filters/PaymentStatusFilter';
import { ShippingStatusFilter } from '@/app/admin/orders/_components/order-filters/ShippingStatusFilter';
import { OrderTypeFilter } from '@/app/admin/orders/_components/order-filters/OrderTypeFilter';
import { cn } from '@/lib/utils';
import { DateFilter } from '@/app/admin/orders/_components/order-filters/DateFilter';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

export default function OrdersClient() {
  const { data: orders = [] } = useSWR<Order[]>('/api/orders', fetcher);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [shippingFilter, setShippingFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPaymentFilter('all');
    setShippingFilter('all');
    setCustomerTypeFilter('all');
  };

  const [sortBy, setSortBy] = useState<'customer' | 'date' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const filteredOrders = orders.filter((order) => {
    const searchMatch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const typeMatch = typeFilter === 'all' || order.type === typeFilter;
    const paymentMatch = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    const customerTypeMatch = customerTypeFilter === 'all' || (customerTypeFilter === 'member' && order.userId && order.userId !== 'null') || (customerTypeFilter === 'guest' && (!order.userId || order.userId === 'null'));

    const shippingMatch =
      shippingFilter === 'all' ||
      (() => {
        const method = order.shippingInfo?.shippingMethod;
        if (shippingFilter === '등록됨') return method === 'courier' && order.invoice?.trackingNumber;
        if (shippingFilter === '미등록') return method === 'courier' && !order.invoice?.trackingNumber;
        if (shippingFilter === '방문수령') return method === 'visit';
        if (shippingFilter === '퀵배송') return method === 'quick';
        if (shippingFilter === '미입력') return !method;
        return false;
      })();

    const matchDate = !selectedDate || new Date(order.date).toDateString() === selectedDate.toDateString();

    return searchMatch && statusMatch && typeMatch && paymentMatch && shippingMatch && customerTypeMatch && matchDate;
  });
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchTerm, statusFilter, typeFilter, paymentFilter, shippingFilter, customerTypeFilter]);
  const ordersPerPage = 10;

  const formatDate = (dateString: string) => new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortBy) return 0;

    let aValue, bValue;

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
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const startIdx = (currentPage - 1) * ordersPerPage;
  const endIdx = startIdx + ordersPerPage;
  const paginatedOrders = sortedOrders.slice(startIdx, endIdx);
  const totalPages = Math.ceil(sortedOrders.length / ordersPerPage);

  const handleSort = (key: 'customer' | 'date' | 'total') => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };
  return (
    <div className="container py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-4xl font-semibold tracking-tight">주문 관리</h1>
          <p className="mt-1 text-xs text-muted-foreground">도깨비 테니스 아카데미의 모든 주문을 관리하고 처리하세요.</p>
        </div>

        {/* 필터 및 검색 */}
        <Card className="mb-5 rounded-xl border-gray-200 bg-white shadow-md px-6 py-5">
          <CardHeader className="pb-3">
            <CardTitle>필터 및 검색</CardTitle>
            <CardDescription className="text-xs">주문 상태, 유형, 결제 상태로 필터링하거나 주문 ID, 고객명, 이메일로 검색하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* 검색 영역 */}
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

              {/* 필터 영역 */}
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
              <CardTitle className="text-base font-medium">주문 목록</CardTitle>
              <p className=" text-xs text-muted-foreground">총 {filteredOrders.length}개의 주문</p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto overflow-visible">
            <div className="w-full">
              <Table className="min-w-full text-xs whitespace-nowrap border border-border">
                <TableHeader>
                  <TableRow className="rounded-xl">
                    <TableHead className="text-center w-[140px]">주문 ID</TableHead>
                    <TableHead onClick={() => handleSort('customer')} className={cn('text-center cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'customer' && 'text-primary')}>
                      고객
                      <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'customer' && 'text-primary', sortBy === 'customer' && sortDirection === 'desc' && 'rotate-180')} />
                    </TableHead>
                    <TableHead className="relative whitespace-nowrap overflow-visible">
                      <div className="flex items-center justify-center gap-2">
                        <span onClick={() => handleSort('date')} className={cn('flex items-center gap-1 cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'date' && 'text-primary')}>
                          <span>날짜</span>
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
                      <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'total' && 'text-primary', sortDirection === 'desc' && sortBy === 'total' && 'rotate-180')} />
                    </TableHead>
                    <TableHead className="text-center w-[40px]">...</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        검색 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedOrders.slice(startIdx, endIdx).map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-center py-2 px-4">
                          <TooltipProvider delayDuration={10}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {/* 툴팁을 트리거하는 요소: 축약된 주문 ID */}
                                {/* 텍스트 폭만큼만 차지하도록 inline-block + truncate */}
                                <span className="inline-block max-w-[160px] truncate cursor-pointer">{shortenId(order.id)}</span>
                              </TooltipTrigger>
                              {/* 마우스를 올렸을 때 나타나는 툴팁 내용 */}
                              <TooltipContent
                                side="top"
                                align="center" // 가로 중앙 기준
                                sideOffset={6} // 트리거와 툴팁 간 세로 간격
                                className="z-50 ml-12 bg-white px-5 py-2.5 rounded-lg shadow-lg border text-base min-w-[240px]"
                              >
                                {/* 전체 주문 ID 표시 */}
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{order.id}</span>

                                  {/* 복사 버튼 (클립보드에 주문 ID 저장) */}
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
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span>
                              {order.customer.name}
                              {!order.userId || order.userId === 'null' ? <span className="ml-1 text-[10px] text-muted-foreground text-gray-500">(비회원)</span> : null}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{order.customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{formatDate(order.date)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${orderStatusColors[order.status]}`}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${paymentStatusColors[order.paymentStatus]}`}>{order.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const method = order.shippingInfo?.shippingMethod;
                            const label = method === 'courier' ? (order.invoice?.trackingNumber ? '등록됨' : '미등록') : method === 'visit' ? '방문수령' : method === 'quick' ? '퀵배송' : '미입력';

                            return <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${shippingStatusColors[label]}`}>{label}</Badge>;
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${orderTypeColors[order.type]}`}>{order.type}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{formatCurrency(order.total)}</TableCell>
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
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/orders/${order.id}/shipping-update`}>
                                  <Truck className="mr-2 h-4 w-4" /> 배송 정보 등록
                                </Link>
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
            <div className="mt-4 flex items-center justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                이전
              </Button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <Button key={i} variant={currentPage === i + 1 ? 'default' : 'outline'} size="sm" className="px-3" onClick={() => setCurrentPage(i + 1)}>
                  {i + 1}
                </Button>
              ))}

              <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
