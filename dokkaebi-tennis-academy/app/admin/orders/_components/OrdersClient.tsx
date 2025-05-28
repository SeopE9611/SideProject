'use client';

import { useState } from 'react';
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

const orderStatusColors = {
  대기중: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  처리중: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  취소: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  환불: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
};

const paymentStatusColors = {
  결제완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  결제대기: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  결제실패: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
};

const orderTypeColors = {
  상품: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  서비스: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
  클래스: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
};

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

  const filteredOrders = orders.filter((order) => {
    const searchMatch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const typeMatch = typeFilter === 'all' || order.type === typeFilter;
    const paymentMatch = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    return searchMatch && statusMatch && typeMatch && paymentMatch;
  });

  const formatDate = (dateString: string) => new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  return (
    <div className="container py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">주문 관리</h1>
          <p className="mt-1 text-xs text-muted-foreground">도깨비 테니스 아카데미의 모든 주문을 관리하고 처리하세요.</p>
        </div>

        {/* 필터 및 검색 */}
        <Card className="mb-6 border-border/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">필터 및 검색</CardTitle>
            <CardDescription className="text-xs">주문 상태, 유형, 결제 상태로 필터링하거나 주문 ID, 고객명, 이메일로 검색하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="search" placeholder="주문 ID, 고객명, 이메일 검색..." className="pl-8 text-xs h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && (
                  <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">검색어 지우기</span>
                  </Button>
                )}
              </div>
              <div className="flex w-full flex-wrap gap-2 md:w-auto">
                {/* 필터 트리거 스타일 */}
                {[statusFilter, typeFilter, paymentFilter].map((_, i) => (
                  <Select key={i} value={i === 0 ? statusFilter : i === 1 ? typeFilter : paymentFilter} onValueChange={i === 0 ? setStatusFilter : i === 1 ? setTypeFilter : setPaymentFilter}>
                    <SelectTrigger className="w-[110px] h-9 text-xs">
                      <Filter className="mr-1 h-3.5 w-3.5" />
                      <SelectValue placeholder={i === 0 ? '주문 상태' : i === 1 ? '주문 유형' : '결제 상태'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {i === 0 &&
                        ['대기중', '처리중', '완료', '취소', '환불'].map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      {i === 1 &&
                        ['상품', '서비스', '클래스'].map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      {i === 2 &&
                        ['결제완료', '결제대기', '결제실패'].map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ))}
                <Button variant="outline" className="h-9 px-2 text-xs">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  내보내기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 목록 테이블 */}
        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">주문 목록</CardTitle>
              <p className="text-xs text-muted-foreground">총 {filteredOrders.length}개의 주문</p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="w-full">
              <Table className="text-xs whitespace-nowrap border border-border">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-center w-[140px]">주문 ID</TableHead>
                    <TableHead className="text-center w-[80px]">고객</TableHead>
                    <TableHead className="text-center w-[180px]">날짜</TableHead>
                    <TableHead className="text-center w-[80px]">상태</TableHead>
                    <TableHead className="text-center w-[80px]">결제</TableHead>
                    <TableHead className="text-center w-[90px]">운송장</TableHead>
                    <TableHead className="text-center w-[70px]">유형</TableHead>
                    <TableHead className="text-center w-[80px]">금액</TableHead>
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
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-center">
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
                            <span>{order.customer.name}</span>
                            <span className="text-[10px] text-muted-foreground">{order.customer.email}</span>
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
                          {order.shippingInfo?.shippingMethod === 'courier' ? (
                            order.invoice?.trackingNumber ? (
                              <Badge variant="default" className="px-2 py-0.5 text-xs whitespace-nowrap">
                                등록됨
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="px-2 py-0.5 text-xs whitespace-nowrap">
                                미등록
                              </Badge>
                            )
                          ) : order.shippingInfo?.shippingMethod === 'visit' ? (
                            <Badge variant="outline" className="px-2 py-0.5 text-xs whitespace-nowrap">
                              방문수령
                            </Badge>
                          ) : order.shippingInfo?.shippingMethod === 'quick' ? (
                            <Badge variant="outline" className="px-2 py-0.5 text-xs whitespace-nowrap">
                              퀵배송
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
                              미입력
                            </Badge>
                          )}
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
              <Button variant="outline" size="sm" disabled>
                이전
              </Button>
              <Button variant="outline" size="sm" className="px-3">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
