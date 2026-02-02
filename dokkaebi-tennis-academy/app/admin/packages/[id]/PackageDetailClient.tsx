'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, Package as PackageIcon, User, Edit3, Clock, Target, MapPin, Phone, Mail, Plus, Minus, History, RotateCcw, CalendarPlus, ChevronRight, User2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import AuthGuard from '@/components/auth/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';
import useSWR from 'swr';
import { parseISO, isValid, format } from 'date-fns';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

import PackagePaymentStatusSelect from '@/app/features/packages/components/PackagePaymentStatusSelect';
import PackagePassStatusSelect from '@/app/features/packages/components/PackagePassStatusSelect';
import PackageCurrentStatusSelect from '@/app/features/packages/components/PackageCurrentStatusSelect';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

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
  paymentStatus?: '결제대기' | '결제완료' | '결제취소' | '취소';
  eventType?: 'extend_expiry' | 'adjust_sessions' | 'payment_status_change';
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

// 배지 색상(라이트/다크 모두 대비 높임)
const passStatusColors: Record<PackageDetail['passStatus'], string> = {
  활성: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  만료: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800',
  일시정지: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800',
  취소: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  대기: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700',
};

const payStatusColors: Record<NonNullable<PackageDetail['paymentStatus']>, string> = {
  결제완료: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  결제대기: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800',
  결제취소: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
};

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
const fmtDate = (v?: string | Date | null) => {
  if (!v) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(v));
  } catch {
    return String(v);
  }
};
const fmtDateTime = (v?: string | Date | null) => {
  if (!v) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
  } catch {
    return String(v);
  }
};

function ExtensionHistoryList({ items }: { items: OperationsHistoryItem[] }) {
  if (!items || items.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">운영 내역이 없습니다.</div>;

  return (
    <ol className="relative ml-1">
      {items.map((it) => {
        const adminLabel = it.adminName || it.adminEmail || '관리자';

        // 유형 판별
        const isExtend = it.eventType === 'extend_expiry' || (typeof it.extendedDays === 'number' && it.extendedDays !== 0);
        const isAdjust = it.eventType === 'adjust_sessions' || (typeof it.extendedSessions === 'number' && it.extendedSessions !== 0);
        const isPayment = it.eventType === 'payment_status_change' || !!it.paymentStatus;

        // 칩 텍스트
        const chips: string[] = [];
        if (isExtend) chips.push(`${it.extendedDays! > 0 ? '+' : ''}${it.extendedDays ?? 0}일 연장`);
        if (isAdjust) chips.push(`${it.extendedSessions! > 0 ? '+' : ''}${it.extendedSessions ?? 0}회 ${it.extendedSessions! >= 0 ? '증가' : '감소'}`);
        if (isPayment && it.paymentStatus) chips.push(`결제상태: ${it.paymentStatus}`);

        // 스타일 (점/헤더색)
        const dotCls = isPayment
          ? it.paymentStatus === '결제완료'
            ? 'bg-blue-500'
            : it.paymentStatus === '결제취소' || it.paymentStatus === '취소'
            ? 'bg-red-500'
            : 'bg-amber-500'
          : isExtend
          ? 'bg-emerald-500'
          : it.extendedSessions! < 0
          ? 'bg-red-500'
          : 'bg-blue-500';

        const headTextCls = isPayment
          ? it.paymentStatus === '결제완료'
            ? 'text-blue-700 dark:text-blue-300'
            : it.paymentStatus === '결제취소' || it.paymentStatus === '취소'
            ? 'text-red-700 dark:text-red-300'
            : 'text-amber-700 dark:text-amber-300'
          : isExtend
          ? 'text-emerald-700 dark:text-emerald-300'
          : it.extendedSessions! < 0
          ? 'text-red-700 dark:text-red-300'
          : 'text-blue-700 dark:text-blue-300';

        return (
          <li key={it.id} className="pl-8 py-4 border-l border-border relative">
            <span className={`absolute -left-[7px] top-6 h-3 w-3 rounded-full ${dotCls} shadow`} />
            <div className={cn('flex items-center gap-2 text-sm', headTextCls)}>
              {isPayment ? <CreditCard className="h-4 w-4" /> : isExtend ? <CalendarPlus className="h-4 w-4" /> : <Target className="h-4 w-4" />}
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

export default function PackageDetailClient({ packageId }: { packageId: string }) {
  const router = useRouter();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSessions, setEditingSessions] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [isSavingExtend, setIsSavingExtend] = useState(false);
  const [isSavingAdjust, setIsSavingAdjust] = useState(false);

  const [extensionData, setExtensionData] = useState({ sessions: 0, days: 0, reason: '' });
  const [sessionAdjustment, setSessionAdjustment] = useState({ amount: 0, reason: '' });

  const {
    data: resp,
    error,
    isLoading,
    mutate,
  } = useSWR<{ item: PackageDetail }>(`/api/package-orders/${packageId}`, fetcher, {
    revalidateOnFocus: false,
  });

  const data = resp?.item;
  const usageHistory = Array.isArray(data?.usageHistory) ? data!.usageHistory : [];
  const operationsHistory = Array.isArray(data?.operationsHistory) ? data!.operationsHistory : Array.isArray(data?.extensionHistory) ? data!.extensionHistory : [];

  const [opsLimit, setOpsLimit] = useState(5);
  useEffect(() => setOpsLimit(5), [data?.id]);

  /**
  * 입력 이탈 경고(Unsaved Changes Guard)
   * - 이 페이지에서 실제 “입력 폼”은 모달 2개(연장/횟수조절)
   */
  const isExtensionDirty = showExtensionForm && (extensionData.days > 0 || extensionData.reason.trim().length > 0);
  const isAdjustDirty = editingSessions && (sessionAdjustment.amount !== 0 || sessionAdjustment.reason.trim().length > 0);
  const isDirty = isExtensionDirty || isAdjustDirty;
  useUnsavedChangesGuard(isDirty);

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
            <Card key={i} className="dark:bg-slate-900/50 dark:border-slate-800">
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
        <div className="text-center text-red-600 dark:text-red-300">패키지 정보를 불러오는 중 오류가 발생했습니다.</div>
      </div>
    );
  }

  // 날짜/진행 계산
  const expiry = toDateSafe(data.expiryDate);
  const daysLeft = daysUntil(expiry);
  const expired = !!expiry && expiry.getTime() < Date.now();

  const progressPercentage = data.usedSessions + data.remainingSessions > 0 ? Math.round((data.usedSessions / (data.usedSessions + data.remainingSessions)) * 100) : 0;
  const isPaid = data.paymentStatus === '결제완료';
  const isCancelled = data.passStatus === '취소';
  const isExpired = daysLeft <= 0;

  const currentExpiryDate = data?.expiryDate ? new Date(data.expiryDate) : null;
  const baseForPreview = ((): Date => {
    const now = new Date();
    return currentExpiryDate && currentExpiryDate > now ? currentExpiryDate : now;
  })();
  const previewExpiryDate = extensionData.days > 0 ? new Date(baseForPreview.getTime() + extensionData.days * 86400000) : null;

  // 액션
  const handleExtension = async () => {
    if (isSavingExtend) return;
    if (extensionData.days <= 0) return showErrorToast('연장할 일수를 입력해주세요.');
    if (!extensionData.reason.trim()) return showErrorToast('연장 사유를 입력해주세요.');

    setIsSavingExtend(true);
    try {
      const res = await fetch(`/api/package-orders/${packageId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'days', days: extensionData.days, reason: extensionData.reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || '연장에 실패했습니다.');
      }
      await mutate();
      showSuccessToast('패키지가 연장되었습니다.');
      setShowExtensionForm(false);
      setExtensionData({ sessions: 0, days: 0, reason: '' });
    } catch (e: any) {
      showErrorToast(e?.message || '연장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingExtend(false);
    }
  };

  // 횟수 조절 처리
  const handleSessionAdjustment = async () => {
    if (isSavingAdjust) return;
    if (sessionAdjustment.amount === 0) return showErrorToast('조절할 횟수를 입력해주세요.');
    if (!sessionAdjustment.reason.trim()) return showErrorToast('조절 사유를 입력해주세요.');

    setIsSavingAdjust(true);
    try {
      const res = await fetch(`/api/package-orders/${packageId}/adjust-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: sessionAdjustment.amount, clampZero: true, reason: sessionAdjustment.reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || '횟수 조절에 실패했습니다.');
      }
      await mutate();
      showSuccessToast('횟수가 조절되었습니다.');
      setEditingSessions(false);
      setSessionAdjustment({ amount: 0, reason: '' });
    } catch (e: any) {
      showErrorToast(e?.message || '횟수 조절 중 오류가 발생했습니다.');
    } finally {
      setIsSavingAdjust(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
        <div className="container py-6">
          {/* 헤더 카드 */}
          <div className="rounded-2xl p-6 md:p-8 border shadow-lg mb-8 bg-white/80 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-slate-100 dark:bg-slate-800">
                  <PackageIcon className="h-7 w-7 text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">패키지 상세 관리</h1>
                  <p className="mt-1 text-sm text-muted-foreground">패키지 ID: {data.id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="border-slate-300 dark:border-slate-700">
                  <Link href="/admin/packages">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    목록으로
                  </Link>
                </Button>
                <Button variant={isEditMode ? 'destructive' : 'outline'} onClick={() => setIsEditMode((v) => !v)} className={isEditMode ? '' : 'border-slate-300 dark:border-slate-700'}>
                  <Edit3 className="mr-1 h-4 w-4" />
                  {isEditMode ? '편집 취소' : '편집 모드'}
                </Button>
              </div>
            </div>

            {/* 요약 KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="rounded-xl p-4 border bg-white/70 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <PackageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">패키지 유형</span>
                </div>
                <p className="text-lg font-semibold">{data.packageType}</p>
              </div>

              <div className="rounded-xl p-4 border bg-white/70 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">남은 횟수</span>
                </div>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{data.remainingSessions}회</p>
              </div>

              <div className="rounded-xl p-4 border bg-white/70 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">결제 금액</span>
                </div>
                <p className="text-lg font-semibold">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(data.price)}</p>
              </div>

              <div className="rounded-xl p-4 border bg-white/70 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">만료일</span>
                </div>
                <p className="text-lg font-semibold">{fmtKDate(expiry)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 고객 정보 */}
            <Card className="border-slate-200 bg-white/80 shadow-lg dark:bg-slate-900/60 dark:border-slate-800">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  고객 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {[
                  { icon: <User className="h-4 w-4" />, label: '이름', value: data.customer.name ?? '이름 없음' },
                  { icon: <Mail className="h-4 w-4" />, label: '이메일', value: data.customer.email ?? '-' },
                  { icon: <Phone className="h-4 w-4" />, label: '전화번호', value: data.customer.phone ?? '-' },
                  { icon: <MapPin className="h-4 w-4" />, label: '서비스 유형', value: data.serviceType },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-muted-foreground">{row.icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="font-medium">{row.value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 패키지 상태 */}
            <Card className="border-slate-200 bg-white/80 shadow-lg dark:bg-slate-900/60 dark:border-slate-800">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <PackageIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    패키지 상태
                  </span>
                  {isEditMode && <Edit3 className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-sm text-muted-foreground">현재 상태</span>
                  <PackageCurrentStatusSelect orderId={packageId} passStatus={data.passStatus as any} paymentStatus={(data.paymentStatus ?? '결제대기') as any} onUpdated={() => mutate()} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-sm text-muted-foreground">결제 상태</span>
                  <Badge className={payStatusColors[data.paymentStatus ?? '결제대기']}>{data.paymentStatus ?? '결제대기'}</Badge>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">이용 진행률</span>
                    <span className="text-sm font-medium">{progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-sky-600 dark:bg-sky-400 transition-all" style={{ width: `${progressPercentage}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>사용: {data.usedSessions}회</span>
                    <span>남은: {data.remainingSessions}회</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">만료까지</span>
                    <span
                      className={cn('text-sm font-medium', expired ? 'text-muted-foreground' : daysLeft <= 7 ? 'text-rose-600 dark:text-rose-400' : daysLeft <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}
                    >
                      {expired ? '만료됨' : `${daysLeft}일 남음`}
                    </span>
                  </div>
                </div>

                {!isPaid && data.paymentStatus !== '결제취소' && <p className="text-xs text-amber-700 dark:text-amber-300">결제대기 상태에서는 연장/횟수 조절을 할 수 없습니다.</p>}
                {isCancelled && <p className="text-xs text-rose-700 dark:text-rose-300">결제취소 상태이므로 모든 작업이 비활성화되었습니다.</p>}
                {isExpired && isPaid && !isCancelled && <p className="text-xs text-muted-foreground">만료된 패스는 연장만 가능합니다.</p>}
              </CardContent>

              {isEditMode && (
                <CardFooter className="flex justify-center gap-2 bg-slate-50/60 dark:bg-slate-800/30">
                  <Button variant="outline" size="sm" disabled={!isPaid || isCancelled} onClick={() => setShowExtensionForm(true)} className="border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                    <RotateCcw className="mr-1 h-4 w-4" />
                    패키지 연장
                  </Button>
                  <Button variant="outline" size="sm" disabled={!isPaid || isCancelled || isExpired} onClick={() => setEditingSessions(true)} className="border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-900/20">
                    <Target className="mr-1 h-4 w-4" />
                    횟수 조절
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* 사용 내역 */}
            <Card className="md:col-span-2 border-slate-200 bg-white/80 shadow-lg dark:bg-slate-900/60 dark:border-slate-800">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  사용 내역
                </CardTitle>
                <CardDescription>패키지 횟수가 차감된 신청서 목록입니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {usageHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">사용 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {usageHistory.map((u) => (
                      <div key={u.id} className="border rounded-lg p-4 transition-colors border-slate-200 bg-white/60 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/60">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                신청서 ID: {u.applicationId}
                              </Badge>
                              <Badge className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300">-{u.sessionsUsed}회 차감</Badge>
                            </div>
                            <p className="font-medium mb-1">{u.description}</p>
                            <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(u.date))}</p>
                            {u.adminNote && <p className="text-sm text-sky-700 dark:text-sky-300 mt-1">관리자 메모: {u.adminNote}</p>}
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/applications/stringing/${u.applicationId}`}>상세 보기</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 운영 내역 */}
            <Card className="md:col-span-2 border-slate-200 bg-white/80 shadow-lg dark:bg-slate-900/60 dark:border-slate-800">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  운영 내역 (연장/횟수)
                </CardTitle>
                <CardDescription>패키지 연장 및 횟수 조절 기록입니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <span className="text-xs text-muted-foreground">
                  총 {operationsHistorySorted.length}건 (현재 {visibleOps.length}건 표시)
                </span>

                {operationsHistorySorted.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">운영 내역이 없습니다.</p>
                ) : (
                  <>
                    <ExtensionHistoryList items={visibleOps} />
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

          {/* 연장 모달 */}
          {showExtensionForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md mx-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>패키지 연장</CardTitle>
                  <CardDescription>패키지의 유효기간을 연장합니다.</CardDescription>
                </CardHeader>
                <CardContent className={cn('space-y-4', isSavingExtend && 'opacity-70 pointer-events-none')}>
                  <div>
                    <Label htmlFor="days">연장 일수</Label>
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">현재 만료일:</span> <span>{fmtDate(currentExpiryDate)}</span>
                      {previewExpiryDate && (
                        <>
                          <ChevronRight className="inline h-4 w-4 mx-1 text-muted-foreground" />
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmtDate(previewExpiryDate)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExtensionData((p) => ({ ...p, days: Math.max(0, p.days - 1) }))} disabled={isSavingExtend || extensionData.days <= 0}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="days"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="text-center"
                        disabled={isSavingExtend}
                        value={String(extensionData.days)}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, '');
                          setExtensionData((p) => ({ ...p, days: v === '' ? 0 : Number(v) }));
                        }}
                      />
                      <Button variant="outline" size="sm" onClick={() => setExtensionData((p) => ({ ...p, days: p.days + 1 }))} disabled={isSavingExtend}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ext-reason">연장 사유</Label>
                    <Textarea id="ext-reason" rows={3} placeholder="연장 사유를 입력하세요" value={extensionData.reason} onChange={(e) => setExtensionData((p) => ({ ...p, reason: e.target.value }))} disabled={isSavingExtend} />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowExtensionForm(false)} disabled={isSavingExtend}>
                    취소
                  </Button>
                  <Button onClick={handleExtension} disabled={isSavingExtend}>
                    {isSavingExtend ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" /> 저장 중…
                      </>
                    ) : (
                      '저장'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* 횟수 조절 모달 */}
          {editingSessions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md mx-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>횟수 조절</CardTitle>
                  <CardDescription>패키지의 남은 횟수를 조절합니다.</CardDescription>
                </CardHeader>
                <CardContent className={cn('space-y-4', isSavingAdjust && 'opacity-70 pointer-events-none')}>
                  <div>
                    <Label htmlFor="adjustment">조절 수량</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      현재 남은 횟수: {data.remainingSessions}회
                      {sessionAdjustment.amount !== 0 && (
                        <span className={cn('ml-2 font-medium', sessionAdjustment.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>→ {data.remainingSessions + sessionAdjustment.amount}회</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={isSavingAdjust} onClick={() => setSessionAdjustment((p) => ({ ...p, amount: p.amount - 1 }))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input id="adjustment" type="number" className="text-center" disabled={isSavingAdjust} value={sessionAdjustment.amount} onChange={(e) => setSessionAdjustment((p) => ({ ...p, amount: Number.parseInt(e.target.value) || 0 }))} />
                      <Button variant="outline" size="sm" disabled={isSavingAdjust} onClick={() => setSessionAdjustment((p) => ({ ...p, amount: p.amount + 1 }))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="adjust-reason">조절 사유</Label>
                    <Textarea id="adjust-reason" rows={3} placeholder="횟수 조절 사유를 입력하세요" value={sessionAdjustment.reason} onChange={(e) => setSessionAdjustment((p) => ({ ...p, reason: e.target.value }))} disabled={isSavingAdjust} />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingSessions(false)} disabled={isSavingAdjust}>
                    취소
                  </Button>
                  <Button onClick={handleSessionAdjustment} disabled={isSavingAdjust}>
                    {isSavingAdjust ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" /> 저장 중…
                      </>
                    ) : (
                      '저장'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
