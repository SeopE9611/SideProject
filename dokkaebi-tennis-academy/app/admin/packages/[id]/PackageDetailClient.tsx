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
import { Skeleton } from '@/components/ui/skeleton';
import useSWR from 'swr';
import { parseISO, isValid, format } from 'date-fns';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { AdminPackageDetailDto, AdminPackageOperationHistoryDto, AdminPackagePassStatusDetail, AdminPackagePaymentStatus } from '@/types/admin/packages';

import PackagePaymentStatusSelect from '@/app/features/packages/components/PackagePaymentStatusSelect';
import PackagePassStatusSelect from '@/app/features/packages/components/PackagePassStatusSelect';
import PackageCurrentStatusSelect from '@/app/features/packages/components/PackageCurrentStatusSelect';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

type PackageDetail = AdminPackageDetailDto;
type OperationsHistoryItem = AdminPackageOperationHistoryDto;

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

// 배지 색상(라이트/다크 모두 대비 높임)
const passStatusColors: Record<AdminPackagePassStatusDetail, string> = {
  활성: 'bg-primary text-primary border-border dark:bg-primary dark:text-primary dark:border-border',
  만료: 'bg-destructive/10 text-destructive border-border dark:bg-destructive/10 dark:text-destructive dark:border-border',
  일시정지: 'bg-muted text-primary border-border dark:bg-muted dark:text-primary dark:border-border',
  취소: 'bg-destructive text-destructive border-destructive dark:bg-destructive dark:text-destructive dark:border-destructive',
  대기: 'bg-background text-foreground border-border dark:bg-card dark:text-muted-foreground dark:border-border',
};

const payStatusColors: Record<AdminPackagePaymentStatus, string> = {
  결제완료: 'bg-primary text-primary border-border dark:bg-primary dark:text-primary dark:border-border',
  결제대기: 'bg-muted text-primary border-border dark:bg-muted dark:text-primary dark:border-border',
  결제취소: 'bg-destructive text-destructive border-destructive dark:bg-destructive dark:text-destructive dark:border-destructive',
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
            ? 'bg-primary'
            : it.paymentStatus === '결제취소' || it.paymentStatus === '취소'
              ? 'bg-destructive'
              : 'bg-muted'
          : isExtend
            ? 'bg-primary'
            : it.extendedSessions! < 0
              ? 'bg-destructive'
              : 'bg-primary';

        const headTextCls = isPayment
          ? it.paymentStatus === '결제완료'
            ? 'text-primary dark:text-primary'
            : it.paymentStatus === '결제취소' || it.paymentStatus === '취소'
              ? 'text-destructive dark:text-destructive'
              : 'text-primary dark:text-primary'
          : isExtend
            ? 'text-primary dark:text-primary'
            : it.extendedSessions! < 0
              ? 'text-destructive dark:text-destructive'
              : 'text-primary dark:text-primary';

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
  } = useSWR<{ item: PackageDetail }>(`/api/admin/package-orders/${packageId}`, fetcher, {
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
            <Card key={i} className="dark:bg-card dark:border-border">
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
        <div className="text-center text-destructive dark:text-destructive">패키지 정보를 불러오는 중 오류가 발생했습니다.</div>
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
      const res = await fetch(`/api/admin/package-orders/${packageId}/extend`, {
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
    } catch (e: unknown) {
      showErrorToast(e instanceof Error ? e.message : '연장 중 오류가 발생했습니다.');
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
      const res = await fetch(`/api/admin/package-orders/${packageId}/adjust-sessions`, {
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
    } catch (e: unknown) {
      showErrorToast(e instanceof Error ? e.message : '횟수 조절 중 오류가 발생했습니다.');
    } finally {
      setIsSavingAdjust(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
        <div className="container py-6">
          {/* 헤더 카드 */}
          <div className="rounded-2xl p-6 md:p-8 border shadow-lg mb-8 bg-card/80 border-border dark:bg-card dark:border-border">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-background dark:bg-card">
                  <PackageIcon className="h-7 w-7 text-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">패키지 상세 관리</h1>
                  <p className="mt-1 text-sm text-muted-foreground">패키지 ID: {data.id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="border-border dark:border-border">
                  <Link href="/admin/packages">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    목록으로
                  </Link>
                </Button>
                <Button variant={isEditMode ? 'destructive' : 'outline'} onClick={() => setIsEditMode((v) => !v)} className={isEditMode ? '' : 'border-border dark:border-border'}>
                  <Edit3 className="mr-1 h-4 w-4" />
                  {isEditMode ? '편집 취소' : '편집 모드'}
                </Button>
              </div>
            </div>

            {/* 요약 KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="rounded-xl p-4 border bg-card border-border dark:bg-card dark:border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <PackageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">패키지 유형</span>
                </div>
                <p className="text-lg font-semibold">{data.packageType}</p>
              </div>

              <div className="rounded-xl p-4 border bg-card border-border dark:bg-card dark:border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">남은 횟수</span>
                </div>
                <p className="text-lg font-semibold text-primary dark:text-primary">{data.remainingSessions}회</p>
              </div>

              <div className="rounded-xl p-4 border bg-card border-border dark:bg-card dark:border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">결제 금액</span>
                </div>
                <p className="text-lg font-semibold">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(data.price)}</p>
              </div>

              <div className="rounded-xl p-4 border bg-card border-border dark:bg-card dark:border-border">
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
            <Card className="border-border bg-card/80 shadow-lg dark:bg-card dark:border-border">
              <CardHeader className="border-b border-border dark:border-border">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-foreground dark:text-foreground" />
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
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background dark:bg-card">
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
            <Card className="border-border bg-card/80 shadow-lg dark:bg-card dark:border-border">
              <CardHeader className="border-b border-border dark:border-border">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <PackageIcon className="h-5 w-5 text-primary dark:text-primary" />
                    패키지 상태
                  </span>
                  {isEditMode && <Edit3 className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background dark:bg-card">
                  <span className="text-sm text-muted-foreground">현재 상태</span>
                  <PackageCurrentStatusSelect orderId={packageId} passStatus={data.passStatus} paymentStatus={data.paymentStatus ?? '결제대기'} onUpdated={() => mutate()} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background dark:bg-card">
                  <span className="text-sm text-muted-foreground">결제 상태</span>
                  <Badge className={payStatusColors[data.paymentStatus ?? '결제대기']}>{data.paymentStatus ?? '결제대기'}</Badge>
                </div>

                <div className="p-3 rounded-lg bg-background dark:bg-card">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">이용 진행률</span>
                    <span className="text-sm font-medium">{progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted dark:bg-card">
                    <div className="h-2 rounded-full bg-muted dark:bg-muted transition-all" style={{ width: `${progressPercentage}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>사용: {data.usedSessions}회</span>
                    <span>남은: {data.remainingSessions}회</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-background dark:bg-card">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">만료까지</span>
                    <span
                      className={cn('text-sm font-medium', expired ? 'text-muted-foreground' : daysLeft <= 7 ? 'text-destructive dark:text-destructive' : daysLeft <= 30 ? 'text-primary dark:text-primary' : 'text-primary dark:text-primary')}
                    >
                      {expired ? '만료됨' : `${daysLeft}일 남음`}
                    </span>
                  </div>
                </div>

                {!isPaid && data.paymentStatus !== '결제취소' && <p className="text-xs text-primary dark:text-primary">결제대기 상태에서는 연장/횟수 조절을 할 수 없습니다.</p>}
                {isCancelled && <p className="text-xs text-destructive dark:text-destructive">결제취소 상태이므로 모든 작업이 비활성화되었습니다.</p>}
                {isExpired && isPaid && !isCancelled && <p className="text-xs text-muted-foreground">만료된 패스는 연장만 가능합니다.</p>}
              </CardContent>

              {isEditMode && (
                <CardFooter className="flex justify-center gap-2 bg-background dark:bg-card">
                  <Button variant="outline" size="sm" disabled={!isPaid || isCancelled} onClick={() => setShowExtensionForm(true)} className="border-border dark:border-border hover:bg-primary dark:hover:bg-primary">
                    <RotateCcw className="mr-1 h-4 w-4" />
                    패키지 연장
                  </Button>
                  <Button variant="outline" size="sm" disabled={!isPaid || isCancelled || isExpired} onClick={() => setEditingSessions(true)} className="border-border dark:border-border hover:bg-muted dark:hover:bg-muted">
                    <Target className="mr-1 h-4 w-4" />
                    횟수 조절
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* 사용 내역 */}
            <Card className="md:col-span-2 border-border bg-card/80 shadow-lg dark:bg-card dark:border-border">
              <CardHeader className="border-b border-border dark:border-border">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary dark:text-primary" />
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
                      <div key={u.id} className="border rounded-lg p-4 transition-colors border-border bg-card hover:bg-background dark:border-border dark:bg-card dark:hover:bg-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                신청서 ID: {u.applicationId}
                              </Badge>
                              <Badge className="text-xs bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive">-{u.sessionsUsed}회 차감</Badge>
                            </div>
                            <p className="font-medium mb-1">{u.description}</p>
                            <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(u.date))}</p>
                            {u.adminNote && <p className="text-sm text-foreground dark:text-foreground mt-1">관리자 메모: {u.adminNote}</p>}
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/applications/stringing/${u.applicationId}`} target="_blank" rel="noreferrer">
                              상세 보기
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 운영 내역 */}
            <Card className="md:col-span-2 border-border bg-card/80 shadow-lg dark:bg-card dark:border-border">
              <CardHeader className="border-b border-border dark:border-border">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-foreground dark:text-foreground" />
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
              <Card className="w-full max-w-md mx-4 border-border dark:border-border dark:bg-card">
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
                          <span className="font-medium text-primary dark:text-primary">{fmtDate(previewExpiryDate)}</span>
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
              <Card className="w-full max-w-md mx-4 border-border dark:border-border dark:bg-card">
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
                        <span className={cn('ml-2 font-medium', sessionAdjustment.amount > 0 ? 'text-primary dark:text-primary' : 'text-destructive dark:text-destructive')}>→ {data.remainingSessions + sessionAdjustment.amount}회</span>
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
  );
}
