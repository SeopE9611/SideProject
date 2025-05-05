"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpDown, ChevronDown, Download, Eye, Filter, MoreHorizontal, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// 주문 상태에 따른 배지 색상 정의
const orderStatusColors = {
  대기중: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  처리중: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  완료: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  취소: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  환불: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
}

// 결제 상태에 따른 배지 색상 정의
const paymentStatusColors = {
  결제완료: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  결제대기: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  결제실패: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
}

// 주문 유형에 따른 배지 색상 정의
const orderTypeColors = {
  상품: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  서비스: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  클래스: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
}

// 임시 주문 데이터
const orders = [
  {
    id: "ORD-2023-1001",
    customer: {
      name: "김지훈",
      email: "jihoon.kim@example.com",
      phone: "010-1234-5678",
    },
    date: "2023-05-15T09:30:00",
    status: "완료",
    paymentStatus: "결제완료",
    total: 189000,
    type: "상품",
    items: [{ name: "윌슨 프로 스태프 97 v13.0 테니스 라켓", quantity: 1, price: 189000 }],
  },
  {
    id: "ORD-2023-1002",
    customer: {
      name: "이서연",
      email: "seoyeon.lee@example.com",
      phone: "010-2345-6789",
    },
    date: "2023-05-16T14:45:00",
    status: "처리중",
    paymentStatus: "결제완료",
    total: 50000,
    type: "서비스",
    items: [{ name: "라켓 스트링 교체 서비스", quantity: 1, price: 50000 }],
  },
  {
    id: "ORD-2023-1003",
    customer: {
      name: "박민준",
      email: "minjun.park@example.com",
      phone: "010-3456-7890",
    },
    date: "2023-05-17T11:15:00",
    status: "대기중",
    paymentStatus: "결제대기",
    total: 120000,
    type: "클래스",
    items: [{ name: "초급자 테니스 클래스 (4회)", quantity: 1, price: 120000 }],
  },
  {
    id: "ORD-2023-1004",
    customer: {
      name: "최예은",
      email: "yeeun.choi@example.com",
      phone: "010-4567-8901",
    },
    date: "2023-05-18T16:30:00",
    status: "취소",
    paymentStatus: "결제실패",
    total: 75000,
    type: "서비스",
    items: [{ name: "테니스 코트 대여 (2시간)", quantity: 1, price: 75000 }],
  },
  {
    id: "ORD-2023-1005",
    customer: {
      name: "정도윤",
      email: "doyun.jung@example.com",
      phone: "010-5678-9012",
    },
    date: "2023-05-19T10:00:00",
    status: "완료",
    paymentStatus: "결제완료",
    total: 320000,
    type: "상품",
    items: [
      { name: "나이키 테니스 슈즈", quantity: 1, price: 150000 },
      { name: "테니스 의류 세트", quantity: 1, price: 170000 },
    ],
  },
  {
    id: "ORD-2023-1006",
    customer: {
      name: "한소율",
      email: "soyul.han@example.com",
      phone: "010-6789-0123",
    },
    date: "2023-05-20T13:20:00",
    status: "환불",
    paymentStatus: "결제완료",
    total: 95000,
    type: "상품",
    items: [{ name: "테니스 가방", quantity: 1, price: 95000 }],
  },
  {
    id: "ORD-2023-1007",
    customer: {
      name: "윤지우",
      email: "jiwoo.yoon@example.com",
      phone: "010-7890-1234",
    },
    date: "2023-05-21T15:45:00",
    status: "완료",
    paymentStatus: "결제완료",
    total: 240000,
    type: "클래스",
    items: [{ name: "중급자 테니스 클래스 (6회)", quantity: 1, price: 240000 }],
  },
  {
    id: "ORD-2023-1008",
    customer: {
      name: "송하은",
      email: "haeun.song@example.com",
      phone: "010-8901-2345",
    },
    date: "2023-05-22T09:10:00",
    status: "처리중",
    paymentStatus: "결제완료",
    total: 135000,
    type: "상품",
    items: [
      { name: "테니스 공 (24개입)", quantity: 2, price: 45000 },
      { name: "테니스 그립 테이프 (12개입)", quantity: 1, price: 45000 },
    ],
  },
]

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")

  // 필터링된 주문 목록
  const filteredOrders = orders.filter((order) => {
    // 검색어 필터링
    const searchMatch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())

    // 주문 상태 필터링
    const statusMatch = statusFilter === "all" || order.status === statusFilter

    // 주문 유형 필터링
    const typeMatch = typeFilter === "all" || order.type === typeFilter

    // 결제 상태 필터링
    const paymentMatch = paymentFilter === "all" || order.paymentStatus === paymentFilter

    return searchMatch && statusMatch && typeMatch && paymentMatch
  })

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount)
  }

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-7xl">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">주문 관리</h1>
          <p className="mt-2 text-muted-foreground">도깨비 테니스 아카데미의 모든 주문을 관리하고 처리하세요.</p>
        </div>

        {/* 필터 및 검색 */}
        <Card className="mb-8 border-border/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle>필터 및 검색</CardTitle>
            <CardDescription>
              주문 상태, 유형, 결제 상태로 필터링하거나 주문 ID, 고객명, 이메일로 검색하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="주문 ID, 고객명, 이메일 검색..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3"
                    onClick={() => setSearchTerm("")}
                  >
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
                    <TableHead className="w-[70px]"></TableHead>
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
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{order.customer.name}</span>
                            <span className="text-xs text-muted-foreground">{order.customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.date)}</TableCell>
                        <TableCell>
                          <Badge className={orderStatusColors[order.status as keyof typeof orderStatusColors]}>
                            {order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={orderStatusColors[order.paymentStatus as keyof typeof orderStatusColors]}>
                            {order.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={orderTypeColors[order.type as keyof typeof orderTypeColors]}>
                            {order.type}</Badge>
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
                                    <Eye className="mr-2 h-4 w-4" />
                                    상세 보기
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
  )
}
