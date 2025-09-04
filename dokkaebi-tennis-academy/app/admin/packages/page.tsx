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
import useSWR from 'swr';

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

// 타입 선언
type PackageType = '10회권' | '30회권' | '50회권' | '100회권';
type ServiceType = '방문' | '출장';

// 패스(또는 주문) 상태 라벨
type PassStatus = '활성' | '만료' | '일시정지' | '취소';
type PaymentStatus = '결제완료' | '결제대기' | '결제취소';

interface PackageListItem {
  id: string;
  userId: string;
  customer: { name?: string; email?: string; phone?: string };
  packageType: PackageType;
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string; 
  expiryDate: string;
  passStatus: PassStatus | '대기';
  paymentStatus: PaymentStatus | string;
  serviceType: ServiceType;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 라벨 맵 
const PKG_LABELS: Record<PackageType, string> = {
  '10회권': '10회권',
  '30회권': '30회권',
  '50회권': '50회권',
  '100회권': '100회권',
} as const;

const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  활성: '활성',
  만료: '만료',
  일시정지: '일시정지',
  취소: '취소',
} as const;

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  결제완료: '결제완료',
  결제대기: '결제대기',
  결제취소: '결제취소',
} as const;

// 인덱싱을 위한 타입 가드 추가
const isPassStatus = (v: string): v is PassStatus => v === '활성' || v === '만료' || v === '일시정지' || v === '취소';
const isPaymentStatus = (v: string): v is PaymentStatus => v === '결제완료' || v === '결제대기' || v === '결제취소';

// 패키지 상태별 색상
const packageStatusColors: Record<PassStatus | '대기', string> = {
  활성: 'bg-green-100 text-green-800 border-green-200',
  만료: 'bg-red-100 text-red-800 border-red-200',
  일시정지: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  취소: 'bg-gray-100 text-gray-800 border-gray-200',
  대기: 'bg-slate-100 text-slate-700 border-slate-200',
};
// 결제 상태별 색상
const paymentStatusColors: Record<PaymentStatus, string> = {
  결제완료: 'bg-blue-100 text-blue-800 border-blue-200',
  결제대기: 'bg-orange-100 text-orange-800 border-orange-200',
  결제취소: 'bg-red-100 text-red-800 border-red-200',
};

// 패키지 타입별 색상
const packageTypeColors: Record<PackageType, string> = {
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
  const [packageTypeFilter, setPackageTypeFilter] = useState<'all' | PackageType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PassStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | ServiceType>('all');
  const pkgLabel = packageTypeFilter === 'all' ? '전체' : PKG_LABELS[packageTypeFilter];
  const passStatusLabel = statusFilter === 'all' ? '전체' : PASS_STATUS_LABELS[statusFilter];
  const paymentLabel = paymentFilter === 'all' ? '전체' : PAYMENT_LABELS[paymentFilter];

  // 정렬 상태
  const [sortBy, setSortBy] = useState<'customer' | 'purchaseDate' | 'remainingSessions' | 'price' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  const qs = new URLSearchParams();
  if (searchTerm) qs.set('q', searchTerm);
  if (statusFilter !== 'all') qs.set('status', statusFilter);
  if (packageTypeFilter !== 'all') qs.set('package', packageTypeFilter.replace('회권', '')); // '10회권' -> '10'
  if (paymentFilter !== 'all') qs.set('payment', paymentFilter);
  if (serviceTypeFilter !== 'all') qs.set('service', serviceTypeFilter);
  if (sortBy) qs.set('sort', `${sortBy}:${sortDirection}`);

  if (packageTypeFilter !== 'all') qs.set('package', packageTypeFilter.replace('회권', ''));
  if (statusFilter !== 'all') qs.set('status', statusFilter);
  if (paymentFilter !== 'all') qs.set('payment', paymentFilter);

  qs.set('page', String(page));
  qs.set('limit', String(limit));

  const { data, error, isValidating, mutate } = useSWR<Paginated<PackageListItem>>(`/api/package-orders?${qs.toString()}`, fetcher);

  // 데이터 준비
  const packages: PackageListItem[] = data?.items ?? [];
  const totalPages: number = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  // 검색 / 필터링 로직
  const filteredPackages = packages.filter((pkg: PackageListItem) => {
    // 검색어 매치: ID, 고객명, 이메일
    const needle = searchTerm.toLowerCase();
    const name = pkg.customer?.name?.toLowerCase() ?? '';
    const email = pkg.customer?.email?.toLowerCase() ?? '';
    const searchMatch = pkg.id.toLowerCase().includes(needle) || name.includes(needle) || email.includes(needle);

    // 필터 매치
    const statusMatch = statusFilter === 'all' || pkg.passStatus === statusFilter;
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
        aValue = (a.customer?.name ?? '').toLowerCase();
        bValue = (b.customer?.name ?? '').toLowerCase();
        break;
      case 'purchaseDate':
        aValue = toDateSafe(a.purchaseDate)?.getTime() ?? 0;
        bValue = toDateSafe(b.purchaseDate)?.getTime() ?? 0;
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
  const formatDate = (v?: string | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  };

  // 날짜 헬퍼
  const toDateSafe = (v?: string | Date | null) => {
    if (!v) return null;
    const d = typeof v === 'string' ? new Date(v) : v;
    return Number.isNaN(d.getTime()) ? null : d;
  };

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
  const getDaysUntilExpiry = (v?: string | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return 0;
    const diffMs = d.getTime() - Date.now();
    return Math.ceil(diffMs / 86400000);
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
                    <p className="text-3xl font-bold text-green-600">{packages.filter((p) => p.passStatus === '활성').length}</p>
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
                    <p className="text-3xl font-bold text-orange-600">{packages.filter((p) => getDaysUntilExpiry(p.expiryDate) <= 30 && p.passStatus === '활성').length}</p>
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
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | PassStatus)}>
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

                  <Select value={packageTypeFilter} onValueChange={(v) => setPackageTypeFilter(v as 'all' | PackageType)}>
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

                  <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as 'all' | PaymentStatus)}>
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

                  <Select value={serviceTypeFilter} onValueChange={(v) => setServiceTypeFilter(v as 'all' | ServiceType)}>
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
                                {(() => {
                                  const cName = pkg.customer?.name ?? '이름없음';
                                  const cEmail = pkg.customer?.email ?? '';
                                  const baseName = cName.replace(/\s*\(비회원\)\s*$/, '');
                                  const isGuest = cName.includes('(비회원)');
                                  return (
                                    <>
                                      <span className="font-medium">
                                        {baseName}
                                        {isGuest && <span className="ml-1 text-xs text-gray-500">(비회원)</span>}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{cEmail}</span>
                                    </>
                                  );
                                })()}
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
                                {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && pkg.passStatus === '활성' && <span className="text-xs text-orange-600 font-medium">{daysUntilExpiry}일 남음</span>}
                                {daysUntilExpiry <= 0 && pkg.passStatus === '활성' && <span className="text-xs text-red-600 font-medium">만료됨</span>}
                              </div>
                            </TableCell>

                            {/* 상태 */}
                            <TableCell className={tdClasses}>
                              {(() => {
                                const pass: PassStatus | '대기' = pkg.passStatus === '활성' || pkg.passStatus === '만료' || pkg.passStatus === '일시정지' || pkg.passStatus === '취소' ? (pkg.passStatus as PassStatus) : '대기';
                                return <Badge className={packageStatusColors[pass]}>{pass}</Badge>;
                              })()}
                            </TableCell>

                            {/* 결제 */}
                            <TableCell className={tdClasses}>
                              <Badge className={paymentStatusColors[(pkg.paymentStatus as PaymentStatus) ?? '결제대기']}>{pkg.paymentStatus}</Badge>
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
