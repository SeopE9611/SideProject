'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDepositBanner } from '@/app/features/rentals/utils/ui';
import { ArrowLeft, Briefcase, Calendar, Clock, CreditCard, Package, CheckCircle, AlertCircle, XCircle, TrendingUp, Truck } from 'lucide-react';
import { racketBrandLabel } from '@/lib/constants';
import CancelRentalDialog from '@/app/mypage/rentals/_components/CancelRentalDialog';

type Rental = {
  id: string;
  brand: string;
  model: string;
  days: number;
  status: 'pending' | 'paid' | 'out' | 'returned' | 'canceled';
  amount?: { fee?: number; deposit?: number; total?: number };
  createdAt?: string;
  dueAt?: string | null;
  outAt?: string | null;
  returnedAt?: string | null;
  depositRefundedAt?: string | null;
  shipping?: {
    outbound?: {
      courier?: string;
      trackingNumber?: string;
      shippedAt?: string | Date | null;
    } | null;
    return?: {
      courier?: string;
      trackingNumber?: string;
      shippedAt?: string | Date | null;
      note?: string;
    } | null;
  } | null;
  // 취소 요청 정보 (상세 화면에서 상태 판단용)
  cancelRequest?: {
    status: 'requested' | 'approved' | 'rejected';
    reasonCode?: string;
    reasonText?: string;
    requestedAt?: string;
    processedAt?: string;
  } | null;
};

// 안전 라벨/URL 헬퍼
const getCourierLabel = (code?: string) => (code ? courierLabel[code] ?? code : '-');

const getTrackHref = (code?: string, no?: string) => {
  if (!code || !no) return '#';
  const key = code as keyof typeof courierTrackUrl;
  const fn = courierTrackUrl[key];
  return typeof fn === 'function' ? fn(no) : '#';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'returned':
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case 'out':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'paid':
      return <Package className="h-5 w-5 text-indigo-500" />;
    case 'canceled':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-slate-500" />;
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'returned':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'out':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'paid':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'canceled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '대기중',
    paid: '결제완료',
    out: '대여중',
    returned: '반납완료',
    canceled: '취소됨',
  };
  return labels[status] || status;
};

const courierLabel: Record<string, string> = {
  cj: 'CJ대한통운',
  post: '우체국',
  logen: '로젠',
  hanjin: '한진',
};
const courierTrackUrl: Record<string, (no: string) => string> = {
  cj: (no) => `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`,
  post: (no) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`,
  logen: (no) => `https://www.ilogen.com/m/personal/trace/${encodeURIComponent(no)}`,
  hanjin: (no) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(no)}`,
};
const fmt = (v?: string | Date | null) => (v ? new Date(v).toLocaleString() : '-');

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
const fmtDateOnly = (v?: string | Date | null) => (v ? new Date(v).toLocaleDateString('ko-KR') : '-');

export default function RentalsDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<Rental | null>(null);
  const refreshRental = async () => {
    try {
      const res = await fetch(`/api/me/rentals/${id}`, { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      setData(json); // 최신 상태로 덮어쓰기
    } catch (e) {
      console.error('대여 상세 재조회 실패', e);
    }
  };

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdrawCancelRequest = async () => {
    if (!data) return;
    if (!data.cancelRequest || data.cancelRequest.status !== 'requested') return;

    try {
      setWithdrawing(true);
      const res = await fetch(`/api/rentals/${data.id}/cancel-withdraw`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.message ?? '대여 취소 요청 철회 중 오류가 발생했습니다.';
        // 프로젝트에서 사용하는 토스트 유틸 있으면 그걸 사용해도 됨
        alert(msg);
        return;
      }

      // 성공 시 상세 상태에서만 cancelRequest 제거
      setData((prev) => (prev ? { ...prev, cancelRequest: null } : prev));

      alert('대여 취소 요청을 철회했습니다.');
    } catch (e) {
      console.error(e);
      alert('대여 취소 요청 철회 중 오류가 발생했습니다.');
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/me/rentals/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error((await res.json()).message || '조회 실패');
        setData(await res.json());
      } catch (e: any) {
        setErr(e.message ?? '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (err) {
    return (
      <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-red-600 dark:text-red-400">에러: {err}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">존재하지 않는 대여 건입니다.</p>
        </CardContent>
      </Card>
    );
  }

  const fee = data.amount?.fee ?? 0;
  const deposit = data.amount?.deposit ?? 0;
  const total = data.amount?.total ?? fee + deposit;

  const banner = getDepositBanner({
    status: data.status,
    returnedAt: data.returnedAt ?? undefined,
    depositRefundedAt: data.depositRefundedAt ?? undefined,
  });

  const hasOutboundShipping = !!data.shipping?.outbound?.trackingNumber;

  // 대기중/결제완료 + 아직 취소요청이 아닌 경우에만 버튼 노출
  const canRequestCancel =
    // 상태는 pending 또는 paid만 허용
    (data.status === 'pending' || data.status === 'paid') &&
    // 출고 운송장이 아직 없을 때만
    !hasOutboundShipping &&
    // 이미 취소 요청이 들어가 있지 않은 경우만
    (!data.cancelRequest || data.cancelRequest.status !== 'requested');
  // 취소 상태 배너용 데이터
  const cancelBanner = data.cancelRequest?.status
    ? {
        status: data.cancelRequest.status as 'requested' | 'approved' | 'rejected',
        title: data.cancelRequest.status === 'requested' ? '대여 취소 요청 처리 중입니다. 관리자 확인 후 결과가 반영됩니다.' : '대여 취소 요청이 거절되었습니다.',
        reason: data.cancelRequest.reasonCode ? `${data.cancelRequest.reasonCode}${data.cancelRequest.reasonText ? ` (${data.cancelRequest.reasonText})` : ''}` : data.cancelRequest.reasonText || '',
      }
    : null;
  return (
    <main className="space-y-8">
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 rounded-2xl p-8 border border-indigo-100 dark:border-indigo-800/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-md">
              <Briefcase className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">대여 상세정보</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">대여번호: {data.id}</p>
            </div>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            {/* 생성됨/결제완료 + 아직 취소요청이 아닌 경우에만 버튼 노출 */}
            {canRequestCancel && <CancelRentalDialog rentalId={data.id} onSuccess={refreshRental} />}

            {data?.status === 'out' && (
              <Link href={`/mypage/rentals/${data.id}/return-shipping`} className="inline-flex items-center text-sm px-3 py-1.5 rounded bg-slate-900 text-white hover:opacity-90 h-8">
                <Truck className="h-4 w-4 mr-2" />
                {data?.shipping?.return?.trackingNumber ? '반납 운송장 수정' : '반납 운송장 등록'}
              </Link>
            )}

            <Button variant="outline" size="sm" asChild className="bg-white/60 backdrop-blur-sm border-indigo-200 hover:bg-indigo-50">
              <Link href="/mypage?tab=rentals">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로 돌아가기
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">라켓 정보</span>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {racketBrandLabel(data.brand)} {data.model}
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">대여 기간</span>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{data.days}일</p>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(data.status)}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">대여 상태</span>
            </div>
            <Badge className={`px-3 py-1 text-sm font-medium ${getStatusBadgeColor(data.status)}`}>{getStatusLabel(data.status)}</Badge>
          </div>
        </div>
      </div>
      {/* 대여 취소 상태 안내 배너 */}
      {cancelBanner && (
        <div
          className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            cancelBanner.status === 'requested'
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/60 dark:bg-amber-950/40 dark:text-amber-100'
              : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100'
          }`}
        >
          <div>
            <p className="font-medium">{cancelBanner.title}</p>
            {/* {cancelBanner.reason && <p className="mt-1 text-xs opacity-80">사유: {cancelBanner.reason}</p>} */}
          </div>

          {cancelBanner.status === 'requested' && (
            <Button variant="outline" size="sm" onClick={handleWithdrawCancelRequest} disabled={withdrawing} className="ml-4 whitespace-nowrap">
              {withdrawing ? '철회 중…' : '취소 요청 철회'}
            </Button>
          )}
        </div>
      )}

      {banner && (
        <div
          className={`rounded-xl border p-6 ${
            banner.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-200'
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800/30 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {banner.tone === 'success' ? <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            <div>
              <p className="font-semibold text-lg">{banner.title}</p>
              {banner.desc && <p className="text-sm mt-1 opacity-80">{banner.desc}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b">
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-indigo-600" />
              <span>대여 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">라켓</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {racketBrandLabel(data.brand)} {data.model}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Clock className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">대여 기간</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{data.days}일</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">상태</p>
                  <Badge className={`mt-1 ${getStatusBadgeColor(data.status)}`}>{getStatusLabel(data.status)}</Badge>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Calendar className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">반납 예정일</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{data.outAt && data.dueAt ? formatDate(data.dueAt) : '-'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b">
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <span>결제 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">대여 수수료</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{fee.toLocaleString()}원</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Package className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">보증금</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{deposit.toLocaleString()}원</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">총 결제 금액</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{total.toLocaleString()}원</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>대여 타임라인</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">대여 시작</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data.outAt ? formatDateTime(data.outAt) : '-'}</p>
              </div>
            </div>

            {data?.shipping?.outbound?.trackingNumber && (
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">출고 운송장 등록</p>
                  <p className="text-xs text-slate-500">{fmtDateOnly(data.shipping.outbound.shippedAt)}</p>
                  <p className="text-sm mt-1">
                    {getCourierLabel(data.shipping.outbound.courier)} ·{' '}
                    <a className="underline underline-offset-2" href={getTrackHref(data.shipping.outbound.courier, data.shipping.outbound.trackingNumber)} target="_blank" rel="noreferrer">
                      {data.shipping.outbound.trackingNumber ?? '-'}
                    </a>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">반납 예정</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data.outAt && data.dueAt ? formatDate(data.dueAt) : '-'}</p>
              </div>
            </div>

            {/* 반납 운송장 등록(사용자 발송) */}
            {data?.shipping?.return?.trackingNumber && (
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">반납 운송장 등록</p>
                  <p className="text-xs text-slate-500">{fmtDateOnly(data.shipping.return.shippedAt)}</p>
                  <p className="text-sm mt-1">
                    {getCourierLabel(data.shipping.return.courier)} ·{' '}
                    <a className="underline underline-offset-2" href={getTrackHref(data.shipping.return.courier, data.shipping.return.trackingNumber)} target="_blank" rel="noreferrer">
                      {data.shipping.return.trackingNumber ?? '-'}
                    </a>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">반납 완료</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data.returnedAt ? formatDateTime(data.returnedAt) : '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">보증금 환불</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data.depositRefundedAt ? formatDateTime(data.depositRefundedAt) : '-'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
