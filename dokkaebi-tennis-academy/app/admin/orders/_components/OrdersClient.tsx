'use client';

import { useState } from 'react';
import { Order } from '@/lib/types/order';
import { ArrowUpDown, ChevronDown, Copy, Download, Eye, Filter, MoreHorizontal, Search, X } from 'lucide-react';
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

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  console.log('orders:', orders);
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">주문 관리</h1>
          <p className="mt-2 text-muted-foreground">도깨비 테니스 아카데미의 모든 주문을 관리하고 처리하세요.</p>
        </div>

        {/* 필터 및 검색 */}
        <Card className="mb-8 border-border/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle>필터 및 검색</CardTitle>
            <CardDescription>주문 상태, 유형, 결제 상태로 필터링하거나 주문 ID, 고객명, 이메일로 검색하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="주문 ID, 고객명, 이메일 검색..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && (
                  <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">검색어 지우기</span>
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:flex-nowrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="주문 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="대기중">대기중</SelectItem>
                    <SelectItem value="처리중">처리중</SelectItem>
                    <SelectItem value="완료">완료</SelectItem>
                    <SelectItem value="취소">취소</SelectItem>
                    <SelectItem value="환불">환불</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="주문 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    <SelectItem value="상품">상품</SelectItem>
                    <SelectItem value="서비스">서비스</SelectItem>
                    <SelectItem value="클래스">클래스</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="결제 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 결제 상태</SelectItem>
                    <SelectItem value="결제완료">결제완료</SelectItem>
                    <SelectItem value="결제대기">결제대기</SelectItem>
                    <SelectItem value="결제실패">결제실패</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="ml-auto">
                  <Download className="mr-2 h-4 w-4" />
                  내보내기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 목록 테이블 */}
        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>주문 목록</CardTitle>
              <p className="text-sm text-muted-foreground">총 {filteredOrders.length}개의 주문</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">
                      <div className="flex items-center">
                        주문 ID
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        고객
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        날짜
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>결제</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        검색 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="relative overflow-visible">
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
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{order.customer.name}</span>
                            <span className="text-xs text-muted-foreground">{order.customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.date)}</TableCell>
                        <TableCell>
                          <Badge className={orderStatusColors[order.status]}> {order.status} </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={paymentStatusColors[order.paymentStatus]}> {order.paymentStatus} </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={orderTypeColors[order.type]}> {order.type} </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <DropdownMenu>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">메뉴 열기</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="left">작업</TooltipContent>
                              </Tooltip>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>작업</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/orders/${order.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> 상세 보기
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  주문 상태 변경
                                  <ChevronDown className="ml-auto h-4 w-4" />
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  결제 상태 변경
                                  <ChevronDown className="ml-auto h-4 w-4" />
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500">주문 취소</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TooltipProvider>
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
              <Button variant="outline" size="sm" className="px-4">
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
