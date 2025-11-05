'use client';

import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Calendar, CreditCard, Package, Settings, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { badgeBase, badgeSizeSm } from '@/lib/badge-style';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

const rentalStatusColors: Record<string, string> = {
  created: 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20',
  paid: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
  out: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20',
  returned: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
  canceled: 'bg-red-500/10 text-red-500 dark:bg-red-500/20',
};

const rentalStatusLabels: Record<string, string> = {
  created: '생성됨',
  paid: '결제완료',
  out: '대여중',
  returned: '반납완료',
  canceled: '취소됨',
};

export default function AdminRentalDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR(id ? `/api/rentals/${id}` : null, fetcher);
  const [busy, setBusy] = useState(false);

  const onToggleRefund = async (mark: boolean) => {
    const ok = confirm(mark ? '보증금 환불 처리할까요?' : '보증금 환불 처리 해제할까요?');
    if (!ok) return;
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/admin/rentals/${id}/deposit/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: mark ? 'mark' : 'clear' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      showErrorToast(json?.message || '처리 실패');
      setBusy(false); // Corrected variable name from setBusyId to setBusy
      return;
    }
    await mutate();
    showSuccessToast(mark ? '환불 처리 완료' : '환불 해제 완료');
    setBusy(false);
  };

  const onOut = async () => {
    if (!confirm('대여를 시작(out) 처리하시겠어요?')) return;
    const res = await fetch(`/api/rentals/${id}/out`, { method: 'POST' });
    if (res.ok) {
      mutate();
      showSuccessToast('대여 시작 처리 완료');
    } else showErrorToast('처리 실패');
  };

  const onReturn = async () => {
    if (!confirm('반납 처리하시겠어요?')) return;
    const res = await fetch(`/api/rentals/${id}/return`, { method: 'POST' });
    if (res.ok) {
      mutate();
      showSuccessToast('반납 처리 완료');
    } else showErrorToast('처리 실패');
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '날짜 없음';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '유효하지 않은 날짜';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!id) return <div className="p-4">유효하지 않은 ID</div>;
  if (isLoading || !data) return <div className="p-4">불러오는 중…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <div className="container py-10 space-y-8">
        <div className="mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-8 border border-purple-100 dark:border-purple-800/30 shadow-lg mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">대여 관리</h1>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">대여 ID: {data.id}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50 dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60" asChild>
                <Link href="/admin/rentals">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  목록으로 돌아가기
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">대여 시작</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.outAt ? formatDate(data.outAt) : '-'}</p>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">총 결제금액</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{won(data.amount?.total)}</p>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">대여 상태</span>
                </div>
                <Badge className={cn(badgeBase, badgeSizeSm, rentalStatusColors[data.status])}>{rentalStatusLabels[data.status] || data.status}</Badge>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">대여 기간</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.days}일</p>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden mb-8">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle>대여 상태 관리</CardTitle>
              <CardDescription>대여 상태를 변경하거나 보증금 환불을 처리할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="bg-sky-600 hover:bg-sky-700"
                  disabled={busy || !(data.status === 'paid')}
                  onClick={async () => {
                    if (busy) return;
                    setBusy(true);
                    await onOut();
                    setBusy(false);
                  }}
                >
                  {busy ? '처리중…' : '대여 시작(out)'}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={busy || !['paid', 'out'].includes(data.status)}
                  onClick={async () => {
                    if (busy) return;
                    setBusy(true);
                    await onReturn();
                    setBusy(false);
                  }}
                >
                  {busy ? '처리중…' : '반납 처리(return)'}
                </Button>
                {data.status === 'returned' &&
                  (data.depositRefundedAt ? (
                    <Button variant="outline" disabled={busy} onClick={() => onToggleRefund(false)}>
                      {busy ? '처리중…' : '환불 해제'}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled={busy} onClick={() => onToggleRefund(true)}>
                      {busy ? '처리중…' : '환불 처리'}
                    </Button>
                  ))}
              </div>
            </CardFooter>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  <span>라켓 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">브랜드</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.brand}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">모델</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">대여 기간</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.days}일</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  <span>결제 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">대여 수수료</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{won(data.amount?.fee)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">보증금</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{won(data.amount?.deposit)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-100 dark:border-purple-800/50">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">총 결제 금액</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{won(data.amount?.total)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/60 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <span>대여 타임라인</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                  <Calendar className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">대여 시작</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{data.outAt ? formatDate(data.outAt) : '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                  <Calendar className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">반납 예정</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{data.dueAt ? formatDate(data.dueAt) : '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                  <Calendar className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">반납 완료</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{data.returnedAt ? formatDate(data.returnedAt) : '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg border border-gray-100 dark:border-slate-700/60">
                  <CreditCard className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">보증금 환불</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{data.depositRefundedAt ? formatDate(data.depositRefundedAt) : '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
