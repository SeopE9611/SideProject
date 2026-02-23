'use client';

import { getDepositBanner } from '@/app/features/rentals/utils/ui';
import CancelRentalDialog from '@/app/mypage/rentals/_components/CancelRentalDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { racketBrandLabel } from '@/lib/constants';
import { AlertCircle, ArrowLeft, Briefcase, Calendar, CheckCircle, Clock, CreditCard, Package, TrendingUp, Truck, Wrench, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Rental = {
  id: string;
  brand: string;
  model: string;
  days: number;
  status: 'pending' | 'paid' | 'out' | 'returned' | 'canceled';
  amount?: {
    fee?: number;
    deposit?: number;
    /**
     * 스트링 상품 금액 (스트링 선택 + 교체 신청한 경우에만 존재)
     * - 과거 데이터 호환을 위해 optional
     */
    stringPrice?: number;
    /**
     * 교체 서비스비(장착비) (스트링 선택 + 교체 신청한 경우에만 존재)
     */
    stringingFee?: number;
    total?: number;
  };
  createdAt?: string;
  dueAt?: string | null;
  outAt?: string | null;
  returnedAt?: string | null;
  depositRefundedAt?: string | null;

  // 대여 기반 교체 서비스 신청서 연결
  stringingApplicationId?: string | null;
  isStringServiceApplied?: boolean;

  /**
   * 교체 서비스 포함 여부 (레거시/예외 케이스 보강)
   * - 목록 API(/api/me/rentals)에서 내려주는 withStringService와 동일한 목적
   */
  withStringService?: boolean;

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
const getCourierLabel = (code?: string) => (code ? (courierLabel[code] ?? code) : '-');

const getTrackHref = (code?: string, no?: string) => {
  if (!code || !no) return '#';
  const key = code as keyof typeof courierTrackUrl;
  const fn = courierTrackUrl[key];
  return typeof fn === 'function' ? fn(no) : '#';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'returned':
      return <CheckCircle className="h-5 w-5 text-primary" />;
    case 'out':
      return <Clock className="h-5 w-5 text-primary" />;
    case 'paid':
      return <Package className="h-5 w-5 text-primary" />;
    case 'canceled':
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'returned':
      return 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary';
    case 'out':
      return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    case 'paid':
      return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    case 'canceled':
      return 'bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-destructive';
    default:
      return 'bg-muted text-foreground dark:bg-muted dark:text-foreground';
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

  // 교체 서비스 포함 여부(상세에서도 리스트와 동일한 분기 기준이 필요)
  // - stringingApplicationId가 있으면: 이미 신청서가 연결된 상태
  // - isStringServiceApplied=true인데 신청서 ID가 비어있는 레거시/예외 케이스를 대비
  const withStringService = Boolean(data?.withStringService) || Boolean(data?.isStringServiceApplied) || Boolean(data?.stringingApplicationId);
  // 신청서 ID가 없는데 교체 서비스가 포함된 경우 => "교체 신청하기" CTA 노출
  const canApplyStringService = withStringService && !data?.stringingApplicationId;

  // 신청서 보기 링크: "마이페이지 탭" 방식으로 통일
  const applicationHref = useMemo(() => {
    const appId = data?.stringingApplicationId;
    if (!appId) return null;
    return `/mypage?tab=applications&applicationId=${encodeURIComponent(appId)}`;
  }, [data?.stringingApplicationId]);

  // 교체 신청하기 링크(대여 기반 신청)
  const applyHref = `/services/apply?rentalId=${encodeURIComponent(id)}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (err) {
    return (
      <Card className="border-0 bg-gradient-to-br from-destructive/10 to-destructive/10 dark:from-destructive/20 dark:to-destructive/20">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 dark:bg-destructive/20">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive">에러: {err}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-0 bg-gradient-to-br from-muted/50 to-muted dark:from-background dark:to-muted">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">존재하지 않는 대여 건입니다.</p>
        </CardContent>
      </Card>
    );
  }

  // 결제 금액(표시용): 서버/DB 저장 구조와 동일하게 분해
  // - stringPrice/stringingFee는 과거 데이터에는 없을 수 있으니 0 fallback
  const fee = data.amount?.fee ?? 0;
  const deposit = data.amount?.deposit ?? 0;
  const stringPrice = data.amount?.stringPrice ?? 0;
  const stringingFee = data.amount?.stringingFee ?? 0;
  // 서버가 total을 계산해 저장하지만, 혹시 없을 경우를 대비해 동일 로직으로 fallback
  const total = data.amount?.total ?? fee + deposit + stringPrice + stringingFee;

  const banner = getDepositBanner({
    status: data.status,
    returnedAt: data.returnedAt ?? undefined,
    depositRefundedAt: data.depositRefundedAt ?? undefined,
  });

  const hasOutboundShipping = !!data.shipping?.outbound?.trackingNumber;

  // 대기중/결제완료 + 아직 취소요청이 아닌 경우에만 '활성화' 허용 (버튼 자체는 항상 노출)
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
      <div className="bg-gradient-to-r from-accent/10 via-accent/10 to-destructive/10 dark:from-accent/10 dark:via-accent/10 dark:to-destructive/20 rounded-2xl p-8 border border-border/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="bg-card dark:bg-muted rounded-full p-3 shadow-md">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-muted-foreground">대여번호: {data.id}</p>

                {data.stringingApplicationId ? (
                  <Badge className="bg-primary/10 text-primary border border-border dark:bg-primary/15 dark:text-primary">신청서 연결됨</Badge>
                ) : withStringService ? (
                  <Badge className="bg-primary/10 text-primary border border-border dark:bg-primary/15 dark:text-primary">교체 서비스 포함</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            {/* 버튼은 항상 노출하되, 조건을 만족하지 않으면 비활성화 */}
            <CancelRentalDialog rentalId={data.id} onSuccess={refreshRental} disabled={!canRequestCancel} />

            {data?.status === 'out' && (
              <Button variant="outline" size="sm" asChild className="bg-card/70 backdrop-blur-sm border-border hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground">
                <Link href={`/mypage/rentals/${data.id}/return-shipping`}>
                  <Truck className="h-4 w-4 mr-2" />
                  {data?.shipping?.return?.trackingNumber ? '반납 운송장 수정' : '반납 운송장 등록'}
                </Link>
              </Button>
            )}

            <Button variant="outline" size="sm" asChild className="bg-card/70 backdrop-blur-sm border-border hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground">
              <Link href="/mypage?tab=rentals">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로 돌아가기
              </Link>
            </Button>
            {/* 교체 서비스 CTA
 - 신청서 ID가 있으면: 신청서 보기
 - ID가 없지만 교체 서비스 포함이면: 교체 신청하기(레거시/예외 케이스 보정) */}
            {applicationHref ? (
              <Link href={applicationHref}>
                <Button className="gap-2">
                  <Wrench className="h-4 w-4" />
                  신청서 보기
                </Button>
              </Link>
            ) : canApplyStringService ? (
              <Link href={applyHref}>
                <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200">
                  <Wrench className="h-4 w-4" />
                  교체 신청하기
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card/70 dark:bg-muted/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">라켓 정보</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {racketBrandLabel(data.brand)} {data.model}
            </p>
          </div>

          <div className="bg-card/70 dark:bg-muted/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">대여 기간</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{data.days}일</p>
          </div>

          <div className="bg-card/70 dark:bg-muted/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(data.status)}
              <span className="text-sm font-medium text-muted-foreground">대여 상태</span>
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
              ? 'border-border bg-muted/50 text-muted-foreground dark:border-border dark:bg-muted/40 dark:text-foreground'
              : 'border-border bg-muted/50 text-foreground dark:border-border dark:bg-background/40 dark:text-foreground'
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
              ? 'bg-primary/10 border-border/35 text-primary dark:bg-primary/20 dark:border-border/45 dark:text-primary'
              : 'bg-muted/10 border-border/35 text-foreground dark:bg-muted/20 dark:border-border/45 dark:text-foreground'
          }`}
        >
          <div className="flex items-center gap-3">
            {banner.tone === 'success' ? <CheckCircle className="h-6 w-6 text-primary" /> : <AlertCircle className="h-6 w-6 text-primary" />}
            <div>
              <p className="font-semibold text-lg">{banner.title}</p>
              {banner.desc && <p className="text-sm mt-1 opacity-80">{banner.desc}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/30 dark:from-background dark:to-muted/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted dark:from-card dark:to-muted border-b">
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <span>대여 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 스트링 상품 금액: 있을 때만 표시(대여만 한 경우 UI가 지저분해지지 않도록) */}
              {stringPrice > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">스트링 상품</p>
                    <p className="font-semibold text-foreground">{stringPrice.toLocaleString()}원</p>
                  </div>
                </div>
              )}

              {/* 교체 서비스비(장착비): 있을 때만 표시 */}
              {stringingFee > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">교체 서비스비</p>
                    <p className="font-semibold text-foreground">{stringingFee.toLocaleString()}원</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">라켓</p>
                  <p className="font-semibold text-foreground">
                    {racketBrandLabel(data.brand)} {data.model}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">대여 기간</p>
                  <p className="font-semibold text-foreground">{data.days}일</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">상태</p>
                  <Badge className={`mt-1 ${getStatusBadgeColor(data.status)}`}>{getStatusLabel(data.status)}</Badge>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">반납 예정일</p>
                  <p className="font-semibold text-foreground">{data.outAt && data.dueAt ? formatDate(data.dueAt) : '-'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/30 dark:from-background dark:to-muted/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted dark:from-card dark:to-muted border-b">
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>결제 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">대여 수수료</p>
                  <p className="font-semibold text-foreground">{fee.toLocaleString()}원</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/50 dark:bg-muted rounded-lg">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">보증금</p>
                  <p className="font-semibold text-foreground">{deposit.toLocaleString()}원</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 rounded-lg border border-border/30">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">총 결제 금액</p>
                  <p className="text-xl font-bold text-primary">{total.toLocaleString()}원</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/30 dark:from-background dark:to-muted/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted dark:from-card dark:to-muted border-b">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>대여 타임라인</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted/50 dark:bg-muted rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">대여 시작</p>
                <p className="text-sm text-muted-foreground">{data.outAt ? formatDateTime(data.outAt) : '-'}</p>
              </div>
            </div>

            {data?.shipping?.outbound?.trackingNumber && (
              <div className="flex items-start gap-4 p-4 bg-muted/50 dark:bg-muted rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">출고 운송장 등록</p>
                  <p className="text-xs text-muted-foreground">{fmtDateOnly(data.shipping.outbound.shippedAt)}</p>
                  <p className="text-sm mt-1">
                    {getCourierLabel(data.shipping.outbound.courier)} ·{' '}
                    <a className="underline underline-offset-2" href={getTrackHref(data.shipping.outbound.courier, data.shipping.outbound.trackingNumber)} target="_blank" rel="noreferrer">
                      {data.shipping.outbound.trackingNumber ?? '-'}
                    </a>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 p-4 bg-muted/50 dark:bg-muted rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">반납 예정</p>
                <p className="text-sm text-muted-foreground">{data.outAt && data.dueAt ? formatDate(data.dueAt) : '-'}</p>
              </div>
            </div>

            {/* 반납 운송장 등록(사용자 발송) */}
            {data?.shipping?.return?.trackingNumber && (
              <div className="flex items-start gap-4 p-4 bg-muted/50 dark:bg-muted rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">반납 운송장 등록</p>
                  <p className="text-xs text-muted-foreground">{fmtDateOnly(data.shipping.return.shippedAt)}</p>
                  <p className="text-sm mt-1">
                    {getCourierLabel(data.shipping.return.courier)} ·{' '}
                    <a className="underline underline-offset-2" href={getTrackHref(data.shipping.return.courier, data.shipping.return.trackingNumber)} target="_blank" rel="noreferrer">
                      {data.shipping.return.trackingNumber ?? '-'}
                    </a>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 p-4 bg-muted/50 dark:bg-muted rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/20">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">반납 완료</p>
                <p className="text-sm text-muted-foreground">{data.returnedAt ? formatDateTime(data.returnedAt) : '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-muted/50 dark:bg-muted rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">보증금 환불</p>
                <p className="text-sm text-muted-foreground">{data.depositRefundedAt ? formatDateTime(data.depositRefundedAt) : '-'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
