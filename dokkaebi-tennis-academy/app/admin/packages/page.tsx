'use client';

import { useMemo, useState } from 'react';
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
  purchaseDate: string | null;
  expiryDate: string | null;
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

  qs.set('page', String(page));
  qs.set('limit', String(limit));

  const { data, error, isValidating, mutate } = useSWR<Paginated<PackageListItem>>(`/api/package-orders?${qs.toString()}`, fetcher, { dedupingInterval: 1000, revalidateOnFocus: false });

  if (error) return <div className="p-6 text-red-600">목록을 불러오지 못했습니다.</div>;

  // 데이터 준비
  const packages: PackageListItem[] = data?.items ?? [];
  const totalPages: number = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  // 검색 / 필터링 로직 (useMemo)
  const filteredPackages = useMemo(() => {
    // 검색어 매치: ID, 고객명, 이메일
    const needle = searchTerm.toLowerCase();
    return packages.filter((pkg) => {
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
  }, [packages, searchTerm, statusFilter, packageTypeFilter, paymentFilter, serviceTypeFilter]);

  // 정렬 로직 (useMemo)
  const sortedPackages = useMemo(() => {
    if (!sortBy) return filteredPackages;
    const arr = [...filteredPackages];
    arr.sort((a, b) => {
      let aValue: string | number = '',
        bValue: string | number = '';
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
    return arr;
  }, [filteredPackages, sortBy, sortDirection]);

  // 날짜 포맷터
  const formatDate = (v?: string | number | Date | null) => {
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
  // - ISO 문자열/Date/number(epoch) 모두 처리
  // - 'YYYY. MM. DD.' / 'YY. MM. DD.' / 'YYYY-MM-DD' / 'YYYY/MM/DD' / 'YYYYMMDD' 지원
  // - 끝의 점(.)/공백 허용
  const toDateSafe = (v?: string | number | Date | null) => {
    if (v == null) return null;

    // Date 인스턴스
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;

    // 숫자(epoch 초/밀리초)
    if (typeof v === 'number') {
      const ms = v < 1e12 ? v * 1000 : v; // 10^12 미만은 초로 판단
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // 문자열
    let s = String(v).trim();

    // 기본 파서(ISO 등)
    const direct = new Date(s);
    if (!Number.isNaN(direct.getTime())) return direct;

    // 'YYYY. MM. DD.' 또는 'YY. MM. DD.'
    const mDot = s.match(/^(\d{2,4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/);
    if (mDot) {
      const y = Number(mDot[1].length === 2 ? '20' + mDot[1] : mDot[1]);
      const mo = Number(mDot[2]);
      const d = Number(mDot[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    // 'YYYY/MM/DD' 또는 'YYYY-MM-DD'
    const mSep = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (mSep) {
      const y = Number(mSep[1]);
      const mo = Number(mSep[2]);
      const d = Number(mSep[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    // 'YYYYMMDD'
    const mCompact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (mCompact) {
      const y = Number(mCompact[1]);
      const mo = Number(mCompact[2]);
      const d = Number(mCompact[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    return null;
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

  // 진행률을 상세 화면과 동일하게 계산: used / (used + remaining)
  // - 분모가 0인 경우 0%
  // - 값은 0~100 사이로 클램프
  function calcProgressPercent(usedRaw: unknown, remainingRaw: unknown) {
    const used = Math.max(0, Number(usedRaw) || 0); // 사용횟수(음수 방지)
    const remaining = Math.max(0, Number(remainingRaw) || 0); // 남은횟수(음수 방지)
    const total = used + remaining; // 현재 총량(연장/횟수조절 반영)
    if (total <= 0) return { percent: 0, used, remaining, total };
    const percent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));
    return { percent, used, remaining, total };
  }

  // 만료일까지 남은 일수 계산
  // - 목록 표기는 "그날 23:59:59"까지 유효로 보여야 운영 혼선을 줄임
  // - 서버가 'YYYY-MM-DD' 같은 날짜 문자열을 줄 때 00:00 해석 문제를 피하기 위함
  const getDaysUntilExpiry = (v?: string | number | Date | null) => {
    const d = toDateSafe(v); // 안전하게 Date로 변환(없으면 null)
    if (!d) return 0;

    // "해당 날짜의 하루 끝"까지 유효로 보이도록 보정
    const endOfDay = new Date(d); // 복사본
    endOfDay.setHours(23, 59, 59, 999); // 로컬(=KST) 기준 EOD

    const diffMs = endOfDay.getTime() - Date.now();
    // 일수 올림(양수면 오늘 포함하여 1일 남음 처럼 보임)
    return Math.ceil(diffMs / 86400000);
  };

  // 목록의 표시 상태를 "결제상태 + 만료일"로 일관되게 계산
  function computeListStatus(paymentStatus?: string | null, passExpiresAt?: string | number | Date | null) {
    // 결제취소가 최우선
    if (paymentStatus === '결제취소') {
      return { label: '결제취소', tone: 'destructive' as const };
    }

    // 만료 계산은 반드시 toDateSafe로(숫자/다양한 포맷 모두 처리)
    const d = toDateSafe(passExpiresAt);
    let expired = false;
    if (d) {
      // 목록은 "그날 23:59:59"까지 유효하게 보정
      const eod = new Date(d);
      eod.setHours(23, 59, 59, 999);
      expired = eod.getTime() < Date.now();
    }

    if (expired) return { label: '만료', tone: 'muted' as const };
    if (paymentStatus && paymentStatus !== '결제완료') return { label: '비활성', tone: 'warning' as const };
    return { label: '활성', tone: 'success' as const };
  }

  // 상태 뱃지 스타일(필요시 프로젝트 공통 Badge에 맞춰 색상만 바꿔도 됨)
  function statusBadgeClass(tone: 'destructive' | 'muted' | 'warning' | 'success') {
    switch (tone) {
      case 'destructive':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'muted':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'success':
      default:
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
  }

  // 연장 반영된 만료일
  function getExpirySource(pkg: any): string | null {
    return pkg?.expiryDate ?? null;
  }

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
                    <p className="text-3xl font-bold text-orange-600">
                      {
                        packages.filter((p) => {
                          const exp = p.expiryDate ?? null;
                          const days = getDaysUntilExpiry(exp);
                          const s = computeListStatus(p.paymentStatus, exp);
                          return s.label !== '결제취소' && days <= 30 && days > 0;
                        }).length
                      }
                    </p>
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
                        const { percent: progressPercentage, total: currentTotal } = calcProgressPercent(pkg.usedSessions, pkg.remainingSessions);

                        // 만료일 소스
                        const expirySource = pkg.expiryDate ?? null;

                        const listState = computeListStatus(pkg.paymentStatus, expirySource);
                        const daysUntilExpiry = getDaysUntilExpiry(expirySource);

                        return (
                          <TableRow key={pkg.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className={tdClasses}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-mono text-sm cursor-pointer">
                                      {pkg.id.slice(0, 6)}…{pkg.id.slice(-4)}
                                    </span>
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
                                <span className="text-xs text-muted-foreground">/ {currentTotal}회</span>
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
                                <span className="text-sm">{formatDate(expirySource)}</span>

                                {/* 결제취소는 남은일수/만료 라벨을 숨김, 나머지만 카운트다운 표시 */}
                                {listState.label !== '결제취소' && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && <span className="text-xs text-orange-600 font-medium">{daysUntilExpiry}일 남음</span>}
                                {/* '만료' 표기 - 실제 계산된 목록 상태(listState) */}
                                {listState.label === '만료' && <span className="text-xs text-red-600 font-medium">만료됨</span>}
                              </div>
                            </TableCell>

                            {/* 상태 (결제취소 최우선 -> 만료 -> 결제대기=비활성 -> 그 외=활성) */}
                            <TableCell className={tdClasses}>
                              {(() => {
                                // 위에서 계산한 listState/expirySource 그대로 사용
                                const badgeCls = statusBadgeClass(listState.tone);
                                return (
                                  <Badge
                                    className={`${badgeCls} font-medium`}
                                    title={`결제상태: ${String(pkg.paymentStatus)} · 만료일: ${formatDate(expirySource)}`} // ← 변경
                                    aria-label={`표시상태 ${listState.label}`}
                                  >
                                    {listState.label}
                                  </Badge>
                                );
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
