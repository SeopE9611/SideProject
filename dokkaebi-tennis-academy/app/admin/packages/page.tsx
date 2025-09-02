'use client';

import { useState } from 'react';
import { ChevronDown, Copy, Eye, Filter, MoreHorizontal, Search, X, Package, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/auth/AuthGuard';

// 패키지 주문 타입 정의
interface PackageOrder {
  id: string;
  userId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  packageType: '10회권' | '30회권' | '50회권' | '100회권';
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string;
  expiryDate: string;
  status: '활성' | '만료' | '일시정지' | '취소';
  paymentStatus: '결제완료' | '결제대기' | '결제취소';
  serviceType: '방문' | '출장';
}

// 더미 데이터
const dummyPackageOrders: PackageOrder[] = [
  {
    id: 'PKG-2024-001',
    userId: 'user123',
    customer: {
      name: '김테니스',
      email: 'kim.tennis@example.com',
      phone: '010-1234-5678',
    },
    packageType: '30회권',
    totalSessions: 30,
    remainingSessions: 25,
    usedSessions: 5,
    price: 300000,
    purchaseDate: '2024-01-15T10:30:00Z',
    expiryDate: '2024-07-15T23:59:59Z',
    status: '활성',
    paymentStatus: '결제완료',
    serviceType: '방문',
  },
  {
    id: 'PKG-2024-002',
    userId: 'user456',
    customer: {
      name: '이스트링',
      email: 'lee.string@example.com',
      phone: '010-2345-6789',
    },
    packageType: '50회권',
    totalSessions: 50,
    remainingSessions: 42,
    usedSessions: 8,
    price: 500000,
    purchaseDate: '2024-01-20T14:15:00Z',
    expiryDate: '2024-10-20T23:59:59Z',
    status: '활성',
    paymentStatus: '결제완료',
    serviceType: '출장',
  },
  {
    id: 'PKG-2024-003',
    customer: {
      name: '박라켓 (비회원)',
      email: 'park.racket@example.com',
      phone: '010-3456-7890',
    },
    packageType: '10회권',
    totalSessions: 10,
    remainingSessions: 7,
    usedSessions: 3,
    price: 100000,
    purchaseDate: '2024-02-01T09:00:00Z',
    expiryDate: '2024-05-01T23:59:59Z',
    status: '활성',
    paymentStatus: '결제완료',
    serviceType: '방문',
  },
  {
    id: 'PKG-2024-004',
    userId: 'user789',
    customer: {
      name: '최코트',
      email: 'choi.court@example.com',
      phone: '010-4567-8901',
    },
    packageType: '100회권',
    totalSessions: 100,
    remainingSessions: 0,
    usedSessions: 100,
    price: 1000000,
    purchaseDate: '2023-12-01T16:45:00Z',
    expiryDate: '2024-12-01T23:59:59Z',
    status: '만료',
    paymentStatus: '결제완료',
    serviceType: '방문',
  },
  {
    id: 'PKG-2024-005',
    userId: 'user101',
    customer: {
      name: '정서브',
      email: 'jung.serve@example.com',
      phone: '010-5678-9012',
    },
    packageType: '30회권',
    totalSessions: 30,
    remainingSessions: 15,
    usedSessions: 15,
    price: 300000,
    purchaseDate: '2024-01-10T11:20:00Z',
    expiryDate: '2024-07-10T23:59:59Z',
    status: '일시정지',
    paymentStatus: '결제완료',
    serviceType: '출장',
  },
];

// 패키지 상태별 색상
const packageStatusColors = {
  활성: 'bg-green-100 text-green-800 border-green-200',
  만료: 'bg-red-100 text-red-800 border-red-200',
  일시정지: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  취소: 'bg-gray-100 text-gray-800 border-gray-200',
};

// 결제 상태별 색상
const paymentStatusColors = {
  결제완료: 'bg-blue-100 text-blue-800 border-blue-200',
  결제대기: 'bg-orange-100 text-orange-800 border-orange-200',
  결제취소: 'bg-red-100 text-red-800 border-red-200',
};

// 패키지 타입별 색상
const packageTypeColors = {
  '10회권': 'bg-purple-100 text-purple-800 border-purple-200',
  '30회권': 'bg-blue-100 text-blue-800 border-blue-200',
  '50회권': 'bg-green-100 text-green-800 border-green-200',
  '100회권': 'bg-orange-100 text-orange-800 border-orange-200',
};

/** 데이터를 받아오는 fetcher 함수 */
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function PackageOrdersClient() {
  // 현재 페이지 번호 상태
  const [page, setPage] = useState(1);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 필터 상태들
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageTypeFilter, setPackageTypeFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

  // 정렬 상태
  const [sortBy, setSortBy] = useState<'customer' | 'purchaseDate' | 'remainingSessions' | 'price' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  // 임시로 더미 데이터 사용 (실제로는 SWR로 API 호출)
  const data = {
    items: dummyPackageOrders,
    total: dummyPackageOrders.length,
  };
  const error = null;

  // 데이터 준비
  const packages = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  // 검색 / 필터링 로직
  const filteredPackages = packages.filter((pkg) => {
    // 검색어 매치: ID, 고객명, 이메일
    const searchMatch = pkg.id.toLowerCase().includes(searchTerm.toLowerCase()) || pkg.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || pkg.customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    // 필터 매치
    const statusMatch = statusFilter === 'all' || pkg.status === statusFilter;
    const packageTypeMatch = packageTypeFilter === 'all' || pkg.packageType === packageTypeFilter;
    const paymentMatch = paymentFilter === 'all' || pkg.paymentStatus === paymentFilter;
    const serviceTypeMatch = serviceTypeFilter === 'all' || pkg.serviceType === serviceTypeFilter;

    return searchMatch && statusMatch && packageTypeMatch && paymentMatch && serviceTypeMatch;
  });

  // 정렬 로직
  const sortedPackages = [...filteredPackages].sort((a, b) => {
    if (!sortBy) return 0;
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortBy) {
      case 'customer':
        aValue = a.customer.name.toLowerCase();
        bValue = b.customer.name.toLowerCase();
        break;
      case 'purchaseDate':
        aValue = new Date(a.purchaseDate).getTime();
        bValue = new Date(b.purchaseDate).getTime();
        break;
      case 'remainingSessions':
        aValue = a.remainingSessions;
        bValue = b.remainingSessions;
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 날짜 포맷터
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString));

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 필터 리셋
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPackageTypeFilter('all');
    setPaymentFilter('all');
    setServiceTypeFilter('all');
  };

  // 정렬 헤더 클릭 핸들러
  const handleSort = (key: 'customer' | 'purchaseDate' | 'remainingSessions' | 'price') => {
    if (sortBy === key) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  // 공통 스타일 상수
  const thClasses = 'px-4 py-2 text-center align-middle ' + 'border-b border-gray-200 dark:border-gray-700 ' + 'font-semibold text-gray-700 dark:text-gray-300';
  const tdClasses = 'px-3 py-4 align-middle text-center';

  // 진행률 계산
  const getProgressPercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  // 만료일까지 남은 일수 계산
  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
        <div className="container py-6">
          {/* 제목 및 설명 */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">패키지 관리</h1>
              <p className="mt-2 text-lg text-gray-600">스트링 교체 서비스 패키지 주문을 관리하고 처리하세요.</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 패키지</p>
                    <p className="text-3xl font-bold text-gray-900">{packages.length}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">활성 패키지</p>
                    <p className="text-3xl font-bold text-green-600">{packages.filter((p) => p.status === '활성').length}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 매출</p>
                    <p className="text-3xl font-bold text-purple-600">{formatCurrency(packages.reduce((sum, p) => sum + p.price, 0))}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">만료 예정</p>
                    <p className="text-3xl font-bold text-orange-600">{packages.filter((p) => getDaysUntilExpiry(p.expiryDate) <= 30 && p.status === '활성').length}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 필터 및 검색 카드 */}
          <Card className="mb-6 border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                필터 및 검색
              </CardTitle>
              <CardDescription>패키지 상태, 유형, 결제 상태로 필터링하거나 패키지 ID, 고객명, 이메일로 검색하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {/* 검색 input */}
                <div className="w-full max-w-md">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="패키지 ID, 고객명, 이메일 검색..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {searchTerm && (
                      <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 필터 컴포넌트들 */}
                <div className="grid w-full gap-2 border-t pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="패키지 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 상태</SelectItem>
                      <SelectItem value="활성">활성</SelectItem>
                      <SelectItem value="만료">만료</SelectItem>
                      <SelectItem value="일시정지">일시정지</SelectItem>
                      <SelectItem value="취소">취소</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={packageTypeFilter} onValueChange={setPackageTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="패키지 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 유형</SelectItem>
                      <SelectItem value="10회권">10회권</SelectItem>
                      <SelectItem value="30회권">30회권</SelectItem>
                      <SelectItem value="50회권">50회권</SelectItem>
                      <SelectItem value="100회권">100회권</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="결제 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 결제</SelectItem>
                      <SelectItem value="결제완료">결제완료</SelectItem>
                      <SelectItem value="결제대기">결제대기</SelectItem>
                      <SelectItem value="결제취소">결제취소</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="서비스 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 서비스</SelectItem>
                      <SelectItem value="방문">방문</SelectItem>
                      <SelectItem value="출장">출장</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={resetFilters} className="w-full bg-transparent">
                    필터 초기화
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 패키지 목록 테이블 */}
          <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>패키지 목록</CardTitle>
                <p className="text-sm text-muted-foreground">총 {filteredPackages.length}개의 패키지</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={thClasses}>패키지 ID</TableHead>
                      <TableHead onClick={() => handleSort('customer')} className={cn(thClasses, 'cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'customer' && 'text-primary')}>
                        고객
                        <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'customer' && sortDirection === 'desc' && 'rotate-180')} />
                      </TableHead>
                      <TableHead className={thClasses}>패키지 유형</TableHead>
                      <TableHead onClick={() => handleSort('remainingSessions')} className={cn(thClasses, 'cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'remainingSessions' && 'text-primary')}>
                        남은 횟수
                        <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'remainingSessions' && sortDirection === 'desc' && 'rotate-180')} />
                      </TableHead>
                      <TableHead className={thClasses}>진행률</TableHead>
                      <TableHead onClick={() => handleSort('purchaseDate')} className={cn(thClasses, 'cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'purchaseDate' && 'text-primary')}>
                        구매일
                        <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'purchaseDate' && sortDirection === 'desc' && 'rotate-180')} />
                      </TableHead>
                      <TableHead className={thClasses}>만료일</TableHead>
                      <TableHead className={thClasses}>상태</TableHead>
                      <TableHead className={thClasses}>결제</TableHead>
                      <TableHead onClick={() => handleSort('price')} className={cn(thClasses, 'cursor-pointer select-none transition-colors hover:text-primary', sortBy === 'price' && 'text-primary')}>
                        금액
                        <ChevronDown className={cn('inline ml-1 w-3 h-3 text-gray-300 transition-transform', sortBy === 'price' && sortDirection === 'desc' && 'rotate-180')} />
                      </TableHead>
                      <TableHead className={thClasses}>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPackages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {searchTerm || statusFilter !== 'all' || packageTypeFilter !== 'all' || paymentFilter !== 'all' || serviceTypeFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 패키지가 없습니다.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedPackages.map((pkg) => {
                        const progressPercentage = getProgressPercentage(pkg.usedSessions, pkg.totalSessions);
                        const daysUntilExpiry = getDaysUntilExpiry(pkg.expiryDate);

                        return (
                          <TableRow key={pkg.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className={tdClasses}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-mono text-sm cursor-pointer">{pkg.id}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="flex items-center gap-2">
                                      <span>{pkg.id}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-4 w-4"
                                        onClick={() => {
                                          navigator.clipboard.writeText(pkg.id);
                                          toast.success('패키지 ID가 클립보드에 복사되었습니다.');
                                        }}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <div className="flex flex-col items-center">
                                <span className="font-medium">
                                  {pkg.customer.name.replace(/\s*$$비회원$$$/, '')}
                                  {pkg.customer.name.includes('(비회원)') && <span className="ml-1 text-xs text-gray-500">(비회원)</span>}
                                </span>
                                <span className="text-xs text-muted-foreground">{pkg.customer.email}</span>
                              </div>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <Badge className={`${packageTypeColors[pkg.packageType]} font-medium`}>{pkg.packageType}</Badge>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-lg">{pkg.remainingSessions}</span>
                                <span className="text-xs text-muted-foreground">/ {pkg.totalSessions}회</span>
                              </div>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                                <span className="text-xs font-medium">{progressPercentage}%</span>
                              </div>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <span className="text-sm">{formatDate(pkg.purchaseDate)}</span>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <div className="flex flex-col items-center">
                                <span className="text-sm">{formatDate(pkg.expiryDate)}</span>
                                {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && pkg.status === '활성' && <span className="text-xs text-orange-600 font-medium">{daysUntilExpiry}일 남음</span>}
                                {daysUntilExpiry <= 0 && pkg.status === '활성' && <span className="text-xs text-red-600 font-medium">만료됨</span>}
                              </div>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <Badge className={packageStatusColors[pkg.status]}>{pkg.status}</Badge>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <Badge className={paymentStatusColors[pkg.paymentStatus]}>{pkg.paymentStatus}</Badge>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <span className="font-medium">{formatCurrency(pkg.price)}</span>
                            </TableCell>

                            <TableCell className={tdClasses}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>작업</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/packages/${pkg.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      상세 보기
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
