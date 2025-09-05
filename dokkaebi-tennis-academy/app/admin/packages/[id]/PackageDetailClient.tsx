'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, Package, User, Settings, Edit3, Clock, Target, MapPin, Phone, Mail, Plus, Minus, History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/auth/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';
import useSWR from 'swr';
import { parseISO, isValid, format } from 'date-fns';
import { CalendarPlus, ChevronRight, User2 } from 'lucide-react';
// 패키지 상세 정보 타입
interface PackageDetail {
  id: string;
  userId?: string;
  customer: { name: string; email: string; phone: string };
  packageType: '10회권' | '30회권' | '50회권' | '100회권';
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string;
  expiryDate: string;

  passStatus: '활성' | '만료' | '일시정지' | '취소' | '대기';

  // status?: never;

  paymentStatus: '결제완료' | '결제대기' | '결제취소';
  serviceType: '방문' | '출장';

  usageHistory: Array<{
    id: string;
    applicationId: string;
    date: string;
    sessionsUsed: number;
    description: string;
    adminNote?: string;
  }>;
  // 운영 이력(연장/횟수조절) – API에서 operationsHistory로 내려옴
  operationsHistory: OperationsHistoryItem[];

  // 하위호환: 기존 extensionHistory를 쓰는 다른 코드를 optional로 남겨둠
  extensionHistory?: OperationsHistoryItem[];
}

type OperationsHistoryItem = {
  id: string;
  date: string;
  extendedSessions?: number; // +N회 / -N회
  extendedDays?: number; // +N일
  reason?: string;
  adminName?: string;
  adminEmail?: string;
  from?: string | null; // 이전 만료일(있으면 표시)
  to?: string | null; // 이후 만료일(있으면 표시)
  eventType?: 'extend_expiry' | 'adjust_sessions';
};

// 패키지 상태별 색상
const packageStatusColors: Record<PackageDetail['passStatus'], string> = {
  활성: 'bg-green-100 text-green-800 border-green-200',
  만료: 'bg-red-100 text-red-800 border-red-200',
  일시정지: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  취소: 'bg-gray-100 text-gray-800 border-gray-200',
  대기: 'bg-slate-100 text-slate-700 border-slate-200',
};

// 결제 상태별 색상
const paymentStatusColors = {
  결제완료: 'bg-blue-100 text-blue-800 border-blue-200',
  결제대기: 'bg-orange-100 text-orange-800 border-orange-200',
  결제취소: 'bg-red-100 text-red-800 border-red-200',
};

/** 데이터를 받아오는 fetcher 함수 */
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Props {
  packageId: string;
}

const toDateSafe = (v: string | Date | null | undefined) => {
  if (!v) return null;
  const d = typeof v === 'string' ? parseISO(v) : v;
  return isValid(d) ? d : null;
};

const fmtKDate = (v: string | Date | null | undefined) => {
  const d = toDateSafe(v);
  return d ? format(d, 'yyyy. MM. dd.') : '-';
};

const daysUntil = (v: string | Date | null | undefined) => {
  const d = toDateSafe(v);
  if (!d) return 0;
  const diffMs = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86400000));
};

function fmtDate(v?: string | Date | null) {
  if (!v) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(v));
  } catch {
    return String(v);
  }
}
function fmtDateTime(v?: string | Date | null) {
  if (!v) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
  } catch {
    return String(v);
  }
}

function ExtensionHistoryList({ items }: { items: OperationsHistoryItem[] }) {
  if (!items || items.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">운영 내역이 없습니다.</div>;
  }

  return (
    <ol className="relative ml-1">
      {items.map((it) => {
        const adminLabel = it.adminName || it.adminEmail || '관리자';

        // 유형 판별
        const isExtend = it.eventType === 'extend_expiry' || (typeof it.extendedDays === 'number' && it.extendedDays !== 0);
        const isAdjust = it.eventType === 'adjust_sessions' || (typeof it.extendedSessions === 'number' && it.extendedSessions !== 0);

        // 칩 텍스트
        const chips: string[] = [];
        if (isExtend) chips.push(`${it.extendedDays! > 0 ? '+' : ''}${it.extendedDays ?? 0}일 연장`);
        if (isAdjust) chips.push(`${it.extendedSessions! > 0 ? '+' : ''}${it.extendedSessions ?? 0}회 ${it.extendedSessions! >= 0 ? '증가' : '감소'}`);

        // 스타일 (점/헤더색)
        const dotCls = isExtend ? 'bg-emerald-500' : it.extendedSessions! < 0 ? 'bg-red-500' : 'bg-blue-500';
        const headTextCls = isExtend ? 'text-emerald-700' : it.extendedSessions! < 0 ? 'text-red-700' : 'text-blue-700';

        return (
          <li key={it.id} className="pl-8 py-4 border-l border-border relative">
            <span className={`absolute -left-[7px] top-6 h-3 w-3 rounded-full ${dotCls} shadow`} />

            <div className={`flex items-center gap-2 text-sm ${headTextCls}`}>
              {isExtend ? <CalendarPlus className="h-4 w-4" /> : <Target className="h-4 w-4" />}
              <span className="font-medium">{chips.length ? chips.join(' · ') : '운영 기록'}</span>
            </div>

            {isExtend
              ? (it.from || it.to) && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{fmtDate(it.from ?? null)}</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="font-medium text-foreground">{fmtDate(it.to ?? null)}</span>
                  </div>
                )
              : (typeof it.from === 'number' || typeof it.to === 'number') && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{typeof it.from === 'number' ? `${it.from}회` : '-'}</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="font-medium text-foreground">{typeof it.to === 'number' ? `${it.to}회` : '-'}</span>
                  </div>
                )}

            {it.reason && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5">{it.reason}</p>}

            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <User2 className="h-3.5 w-3.5" />
              <span>처리자: {adminLabel}</span>
              <span>·</span>
              <span>{fmtDateTime(it.date)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function PackageDetailClient({ packageId }: Props) {
  const router = useRouter();

  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSessions, setEditingSessions] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  // 연장 모달 상태
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionData, setExtensionData] = useState({
    sessions: 0,
    days: 0,
    reason: '',
  });

  // 횟수 조절 상태
  const [sessionAdjustment, setSessionAdjustment] = useState({
    amount: 0,
    reason: '',
  });

  // SWR로 실데이터 호출
  const { data: resp, error, isLoading, mutate } = useSWR<{ item: PackageDetail }>(`/api/package-orders/${packageId}`, fetcher, { revalidateOnFocus: false });

  const data = resp?.item;
  const usageHistory = Array.isArray(data?.usageHistory) ? data!.usageHistory : [];
  const extensionHistory = Array.isArray(data?.extensionHistory) ? data!.extensionHistory : [];
  // 운영 이력(연장/횟수) 통합: 신(operationsHistory) 우선, 없으면 구(extensionHistory) 사용
  const operationsHistory = Array.isArray(data?.operationsHistory) ? data!.operationsHistory : Array.isArray(data?.extensionHistory) ? data!.extensionHistory : [];

  // 최초 5개만 보여주고 '더 보기'로 5개씩 추가
  const [opsLimit, setOpsLimit] = useState(5);

  // 페이지/아이템 교체 시 초기화
  useEffect(() => {
    setOpsLimit(5);
  }, [data?.id]);

  // 최신순 정렬(내림차순)
  const operationsHistorySorted = [...operationsHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 화면에 보여줄 슬라이스
  const visibleOps = operationsHistorySorted.slice(0, opsLimit);
  const opsHasMore = operationsHistorySorted.length > opsLimit;

  // 로딩/에러 처리
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-6">
        <div className="text-center text-red-500">패키지 정보를 불러오는 중 오류가 발생했습니다.</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-6">
        <div className="text-center text-gray-500">해당 패키지를 찾을 수 없습니다.</div>
      </div>
    );
  }

  // 날짜 포맷터
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString));

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 진행률 계산
  const getProgressPercentage = (used: number, total: number) => (total > 0 ? Math.round((used / total) * 100) : 0);

  // 만료일까지 남은 일수 계산
  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const expiry = toDateSafe(data?.expiryDate);
  const daysLeft = daysUntil(expiry); // 0 이상 정수 (지난 날짜면 0)
  const expired = !!expiry && expiry.getTime() < Date.now();

  // 패키지 연장 처리
  const handleExtension = async () => {
    if (extensionData.sessions <= 0 && extensionData.days <= 0) {
      toast.error('연장할 횟수 또는 기간을 입력해주세요.');
      return;
    }

    if (!extensionData.reason.trim()) {
      toast.error('연장 사유를 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(`/api/package-orders/${packageId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: extensionData.days > 0 ? 'days' : 'absolute',
          days: extensionData.days > 0 ? extensionData.days : undefined,
          newExpiry: extensionData.days > 0 ? undefined : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // fallback absolute 예시
          reason: extensionData.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || '연장에 실패했습니다.');
      }
      await mutate(); // 최신 데이터 갱신
      toast.success('패키지가 연장되었습니다.');
      setShowExtensionForm(false);
      setExtensionData({ sessions: 0, days: 0, reason: '' });
    } catch (e: any) {
      toast.error(e?.message || '연장 중 오류가 발생했습니다.');
    }
  };

  // 횟수 조절 처리
  const handleSessionAdjustment = async () => {
    if (sessionAdjustment.amount === 0) {
      toast.error('조절할 횟수를 입력해주세요.');
      return;
    }

    if (!sessionAdjustment.reason.trim()) {
      toast.error('조절 사유를 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(`/api/package-orders/${packageId}/adjust-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta: sessionAdjustment.amount,
          clampZero: true,
          reason: sessionAdjustment.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || '횟수 조절에 실패했습니다.');
      }
      await mutate();
      toast.success('횟수가 조절되었습니다.');
      setEditingSessions(false);
      setSessionAdjustment({ amount: 0, reason: '' });
    } catch (e: any) {
      toast.error(e?.message || '횟수 조절 중 오류가 발생했습니다.');
    }
  };

  // 진행률계산을 "사용 + 남은"을 분모로 계산
  const progressPercentage = getProgressPercentage(data.usedSessions, data.usedSessions + data.remainingSessions);

  const daysUntilExpiry = getDaysUntilExpiry(data.expiryDate);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
        <div className="container py-6">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-purple-100 shadow-lg mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">패키지 상세 관리</h1>
                  <p className="mt-1 text-gray-600">패키지 ID: {data.id}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50" asChild>
                  <Link href="/admin/packages">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    패키지 목록으로 돌아가기
                  </Link>
                </Button>
                <Button variant={isEditMode ? 'destructive' : 'outline'} size="sm" onClick={() => setIsEditMode(!isEditMode)} className={isEditMode ? '' : 'bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50'}>
                  <Edit3 className="mr-1 h-4 w-4" />
                  {isEditMode ? '편집 취소' : '편집 모드'}
                </Button>
              </div>
            </div>

            {/* 패키지 요약 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">패키지 유형</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{data.packageType}</p>
              </div>

              <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">남은 횟수</span>
                </div>
                <p className="text-lg font-semibold text-green-600">{data.remainingSessions}회</p>
              </div>

              <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">결제 금액</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.price)}</p>
              </div>

              <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">만료일</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{fmtKDate(expiry)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 고객 정보 */}
            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>고객 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">이름</p>
                      <p className="font-semibold text-gray-900">{data.customer.name ?? '이름 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">이메일</p>
                      <p className="font-semibold text-gray-900">{data.customer.email ?? '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">전화번호</p>
                      <p className="font-semibold text-gray-900">{data.customer.phone ?? '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">서비스 유형</p>
                      <p className="font-semibold text-gray-900">{data.serviceType}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 패키지 상태 */}
            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-green-600" />
                    <span>패키지 상태</span>
                  </div>
                  {isEditMode && <Edit3 className="h-4 w-4 text-gray-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* 패키지 상태 카드 내부 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">현재 상태</span>
                    <Badge className={packageStatusColors[data.passStatus] ?? packageStatusColors['대기']}>{data.passStatus}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">결제 상태</span>
                    <Badge className={paymentStatusColors[data.paymentStatus]}>{data.paymentStatus}</Badge>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">이용 진행률</span>
                      <span className="text-sm font-medium">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>사용: {data.usedSessions}회</span>
                      <span>남은: {data.remainingSessions}회</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">만료까지</span>
                      <span className={cn('text-sm font-medium', expired ? 'text-gray-500' : daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-orange-600' : 'text-emerald-600')}>{expired ? '만료됨' : `${daysLeft}일 남음`}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              {isEditMode && (
                <CardFooter className="flex justify-center gap-2 bg-gray-50/50">
                  <Button variant="outline" size="sm" onClick={() => setShowExtensionForm(true)} className="hover:bg-green-50 border-green-200">
                    <RotateCcw className="mr-1 h-4 w-4" />
                    패키지 연장
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingSessions(true)} className="hover:bg-blue-50 border-blue-200">
                    <Target className="mr-1 h-4 w-4" />
                    횟수 조절
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* 사용 내역 */}
            <Card className="md:col-span-2 border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center space-x-2">
                  <History className="h-5 w-5 text-orange-600" />
                  <span>사용 내역</span>
                </CardTitle>
                <CardDescription>패키지 횟수가 차감된 신청서 목록입니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {usageHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">사용 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {usageHistory.map((usage) => (
                      <div key={usage.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                신청서 ID: {usage.applicationId}
                              </Badge>
                              <Badge className="bg-red-100 text-red-800 text-xs">-{usage.sessionsUsed}회 차감</Badge>
                            </div>
                            <p className="font-medium text-gray-900 mb-1">{usage.description}</p>
                            <p className="text-sm text-gray-600">{formatDate(usage.date)}</p>
                            {usage.adminNote && <p className="text-sm text-blue-600 mt-1">관리자 메모: {usage.adminNote}</p>}
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/applications/stringing/${usage.applicationId}`}>상세 보기</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 연장 내역 */}
            <Card className="md:col-span-2 border-0 bg-white/80 shadow-lg backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span>운영 내역 (연장/횟수)</span>
                </CardTitle>
                <CardDescription className="mt-1">패키지 연장 및 횟수 조절 기록입니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <span className="text-xs text-muted-foreground">
                  총 {operationsHistorySorted.length}건 (현재 {visibleOps.length}건 표시)
                </span>
                {operationsHistorySorted.length > 0 && (
                  <div className="mb-2 flex justify-end">
                    <span className="text-xs text-muted-foreground">총 {operationsHistorySorted.length}건이 검색되었습니다.</span>
                  </div>
                )}
                {operationsHistorySorted.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">운영 내역이 없습니다.</p>
                ) : (
                  <>
                    {/* 리스트: 현재 슬라이스만 */}
                    <ExtensionHistoryList items={visibleOps} />

                    {/* 더 보기 / 접기 */}
                    <div className="pt-4 flex justify-center items-center gap-2">
                      {opsHasMore ? (
                        <Button variant="outline" size="sm" onClick={() => setOpsLimit((n) => n + 5)}>
                          더 보기
                        </Button>
                      ) : operationsHistorySorted.length > 5 ? (
                        <>
                          <p className="text-xs text-muted-foreground">마지막 페이지입니다.</p>
                          <Button variant="ghost" size="sm" onClick={() => setOpsLimit(5)}>
                            접기
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 패키지 연장 모달 */}
          {showExtensionForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>패키지 연장</CardTitle>
                  <CardDescription>패키지의 유효기간을 연장할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="days">연장 일수</Label>
                    <Input id="days" type="number" min="0" value={extensionData.days} onChange={(e) => setExtensionData((prev) => ({ ...prev, days: Number.parseInt(e.target.value) || 0 }))} placeholder="연장할 일수를 입력하세요" />
                  </div>
                  <div>
                    <Label htmlFor="reason">연장 사유</Label>
                    <Textarea id="reason" value={extensionData.reason} onChange={(e) => setExtensionData((prev) => ({ ...prev, reason: e.target.value }))} placeholder="연장 사유를 입력하세요" rows={3} />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowExtensionForm(false)}>
                    취소
                  </Button>
                  <Button onClick={handleExtension}>연장 처리</Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* 횟수 조절 모달 */}
          {editingSessions && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>횟수 조절</CardTitle>
                  <CardDescription>패키지의 남은 횟수를 조절할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="adjustment">조절 횟수</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSessionAdjustment((prev) => ({ ...prev, amount: prev.amount - 1 }))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input id="adjustment" type="number" value={sessionAdjustment.amount} onChange={(e) => setSessionAdjustment((prev) => ({ ...prev, amount: Number.parseInt(e.target.value) || 0 }))} className="text-center" />
                      <Button variant="outline" size="sm" onClick={() => setSessionAdjustment((prev) => ({ ...prev, amount: prev.amount + 1 }))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      현재 남은 횟수: {data.remainingSessions}회
                      {sessionAdjustment.amount !== 0 && <span className={cn('ml-2 font-medium', sessionAdjustment.amount > 0 ? 'text-green-600' : 'text-red-600')}>→ {data.remainingSessions + sessionAdjustment.amount}회</span>}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="adjustReason">조절 사유</Label>
                    <Textarea id="adjustReason" value={sessionAdjustment.reason} onChange={(e) => setSessionAdjustment((prev) => ({ ...prev, reason: e.target.value }))} placeholder="횟수 조절 사유를 입력하세요" rows={3} />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingSessions(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSessionAdjustment}>조절 처리</Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
