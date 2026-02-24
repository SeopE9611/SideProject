'use client';

import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Calendar, CreditCard, Loader2, Package, Settings, Truck, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { adminFetcher, adminMutator, ensureAdminMutationSucceeded } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';
import { badgeBase, badgeSizeSm } from '@/lib/badge-style';
import Link from 'next/link';
import AdminRentalHistory from '@/app/admin/rentals/_components/AdminRentalHistory';
import { derivePaymentStatus, deriveShippingStatus } from '@/app/features/rentals/utils/status';
import { racketBrandLabel } from '@/lib/constants';
import LinkedDocsCard, { LinkedDocItem } from '@/components/admin/LinkedDocsCard';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

const fetcher = (url: string) => adminFetcher<any>(url, { cache: 'no-store' });
const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

const rentalStatusColors: Record<string, string> = {
  pending: 'bg-muted/10 text-muted-foreground dark:bg-muted/20',
  paid: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  out: 'bg-muted text-foreground dark:bg-muted',
  returned: 'bg-success/10 text-success dark:bg-success/10',
  canceled: 'bg-destructive/10 text-destructive dark:bg-destructive/15',
};

const rentalStatusLabels: Record<string, string> = {
  pending: '대기중',
  paid: '결제완료',
  out: '대여중',
  returned: '반납완료',
  canceled: '취소됨',
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

// 날짜 포맷 보조
const fmt = (v?: string | Date | null) => (v ? new Date(v).toLocaleString() : '-');

// 관리자용 취소 요청 상태 정보 헬퍼
function getAdminRentalCancelInfo(rental: any): {
  label: string;
  badge: string;
  reason?: string;
  status: 'requested' | 'approved' | 'rejected';
} | null {
  const cancel = rental?.cancelRequest;
  if (!cancel || !cancel.status) return null;

  const reasonSummary = cancel.reasonCode ? `${cancel.reasonCode}${cancel.reasonText ? ` (${cancel.reasonText})` : ''}` : cancel.reasonText || '';

  switch (cancel.status) {
    case 'requested':
      return {
        status: 'requested',
        label: '고객이 대여 취소를 요청했습니다.',
        badge: '요청됨',
        reason: reasonSummary,
      };
    case 'approved':
      return {
        status: 'approved',
        label: '취소 요청이 승인되어 대여가 취소되었습니다.',
        badge: '승인',
        reason: reasonSummary,
      };
    case 'rejected':
      return {
        status: 'rejected',
        label: '취소 요청이 거절되었습니다.',
        badge: '거절',
        reason: reasonSummary,
      };
    default:
      return null;
  }
}
export default function AdminRentalDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading, mutate } = useSWR(id ? `/api/admin/rentals/${id}` : null, fetcher);

  const [busyAction, setBusyAction] = useState<null | 'approveCancel' | 'rejectCancel' | 'out' | 'return' | 'refundMark' | 'refundClear'>(null);
  const [pendingAction, setPendingAction] = useState<null | 'out' | 'return' | 'refundMark' | 'refundClear'>(null);

  const isBusy = busyAction !== null;
  // 무통장 결제확정: created → paid 전이
  const onConfirmPayment = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const result = await runAdminActionWithToast({
        action: async () => {
          const json = await adminMutator<{ ok?: boolean; message?: string }>(`/api/admin/rentals/${id}/payment/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          ensureAdminMutationSucceeded(json, '결제확정 실패');
          return json;
        },
        successMessage: '결제완료로 상태 변경',
        fallbackErrorMessage: '결제확정 실패',
      });
      if (result) await mutate();
    } finally {
      setConfirming(false);
    }
  };

  const onToggleRefund = async (mark: boolean) => {
    const result = await runAdminActionWithToast({
      action: async () => {
        const json = await adminMutator<{ ok?: boolean; message?: string }>(`/api/admin/rentals/${id}/deposit/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: mark ? 'mark' : 'clear' }),
        });
        ensureAdminMutationSucceeded(json, '처리 실패');
        return json;
      },
      successMessage: mark ? '보증금 환불 처리 완료' : '보증금 환불 처리 해제 완료',
      fallbackErrorMessage: '처리 실패',
    });
    if (result) await mutate();
  };

  const onOut = async () => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/rentals/${id}/out`, { method: 'POST' }),
      successMessage: '대여 시작 처리 완료',
      fallbackErrorMessage: '처리 실패',
    });
    if (result) await mutate();
  };

  const onReturn = async () => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/rentals/${id}/return`, { method: 'POST' }),
      successMessage: '반납 처리 완료',
      fallbackErrorMessage: '처리 실패',
    });
    if (result) await mutate();
  };

  // 대여 취소 요청 승인
  const onApproveCancel = async () => {
    const result = await runAdminActionWithToast({
      action: async () => {
        const json = await adminMutator<{ ok?: boolean; detail?: string; message?: string }>(`/api/admin/rentals/${id}/cancel-approve`, { method: 'POST' });
        ensureAdminMutationSucceeded(json, '취소 요청 승인에 실패했습니다.');
        return json;
      },
      successMessage: '대여 취소 요청을 승인했습니다.',
      fallbackErrorMessage: '취소 요청 승인에 실패했습니다.',
    });
    if (result) await mutate();
  };

  // 대여 취소 요청 거절
  const onRejectCancel = async () => {
    const result = await runAdminActionWithToast({
      action: async () => {
        const json = await adminMutator<{ ok?: boolean; detail?: string; message?: string }>(`/api/admin/rentals/${id}/cancel-reject`, { method: 'POST' });
        ensureAdminMutationSucceeded(json, '취소 요청 거절에 실패했습니다.');
        return json;
      },
      successMessage: '대여 취소 요청을 거절했습니다.',
      fallbackErrorMessage: '취소 요청 거절에 실패했습니다.',
    });
    if (result) await mutate();
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

  const fmtDateOnly = (v?: string | Date | null) => (v ? new Date(v).toLocaleDateString('ko-KR') : '-');

  const pendingDialogConfig =
    pendingAction === 'out'
      ? {
          title: '대여 시작 처리할까요?',
          description: '대여 상태가 대여중(out)으로 변경됩니다.',
          confirmText: '대여 시작',
          eventKey: 'admin-rental-detail-out-confirm',
          eventMeta: { rentalId: id, currentStatus: data?.status },
        }
      : pendingAction === 'return'
        ? {
            title: '반납 처리할까요?',
            description: '대여 상태가 반납완료(returned)로 변경됩니다.',
            confirmText: '반납 처리',
            eventKey: 'admin-rental-detail-return-confirm',
            eventMeta: { rentalId: id, currentStatus: data?.status },
          }
        : pendingAction === 'refundMark'
          ? {
              title: '보증금 환불 처리할까요?',
              description: '이 작업은 보증금 환불 완료 상태로 기록됩니다.',
              confirmText: '환불 처리',
              eventKey: 'admin-rental-detail-refund-mark-confirm',
              eventMeta: { rentalId: id, currentStatus: data?.status },
            }
          : pendingAction === 'refundClear'
            ? {
                title: '보증금 환불 처리를 해제할까요?',
                description: '이 작업은 환불 완료 기록을 해제합니다.',
                confirmText: '환불 해제',
                eventKey: 'admin-rental-detail-refund-clear-confirm',
                eventMeta: { rentalId: id, currentStatus: data?.status },
              }
            : null;

  const handleConfirmPendingAction = async () => {
    if (!pendingAction || isBusy) return;

    const actionToRun = pendingAction;
    setPendingAction(null);
    setBusyAction(actionToRun);
    try {
      if (actionToRun === 'out') {
        await onOut();
        return;
      }
      if (actionToRun === 'return') {
        await onReturn();
        return;
      }
      await onToggleRefund(actionToRun === 'refundMark');
    } finally {
      setBusyAction(null);
    }
  };

  if (!id) return <div className="p-4">유효하지 않은 ID</div>;
  if (isLoading || !data) return <div className="p-4">불러오는 중…</div>;

  const Outbound = data?.shipping?.outbound;
  const ReturnShip = data?.shipping?.return;
  const canConfirmPayment = data.status === 'pending' && (!data.cancelRequest || data.cancelRequest.status === 'rejected');

  // 취소 요청 상태 정보
  const cancelInfo = getAdminRentalCancelInfo(data);

  // 연결 문서(표시 전용)
  const linkedDocs: LinkedDocItem[] = data?.stringingApplicationId
    ? [
        {
          kind: 'stringing_application',
          id: String(data.stringingApplicationId),
          href: `/admin/applications/stringing/${encodeURIComponent(String(data.stringingApplicationId))}`,
          subtitle: '대여 기반 교체서비스 신청서',
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/30">
      <div className="container py-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="bg-muted/30 rounded-2xl p-8 border border-border/30 shadow-lg mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-card rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">대여 관리</h1>
                  <p className="mt-1 text-muted-foreground">대여 ID: {data.id}</p>
                </div>
              </div>
              <div className="sm:ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" size="sm" className="h-8 border-border text-foreground hover:bg-muted" asChild>
                  <Link href="/admin/rentals">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    목록으로 돌아가기
                  </Link>
                </Button>

                {data?.status !== 'canceled' && (
                  <Button asChild variant="outline" size="sm" className="h-8 border-border text-foreground hover:bg-muted whitespace-nowrap">
                    <Link href={`/admin/rentals/${id}/shipping-update`}>
                      <Truck className="h-4 w-4 mr-2" />
                      {data?.shipping?.outbound?.trackingNumber ? '출고 운송장 수정' : '출고 운송장 등록'}
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">대여 시작</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{data.outAt ? formatDate(data.outAt) : '-'}</p>
              </div>

              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">총 결제금액</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{won(data.amount?.total)}</p>
              </div>

              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">대여 상태</span>
                </div>
                <Badge className={cn(badgeBase, badgeSizeSm, rentalStatusColors[data.status])}>{rentalStatusLabels[data.status] || data.status}</Badge>
              </div>

              <div className="bg-card/60 dark:bg-card/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">대여 기간</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{data.days}일</p>
              </div>
            </div>
            {/* 취소 요청 상태 안내 (관리자용) */}
            {cancelInfo && (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm text-primary">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-primary">취소 요청 상태: {cancelInfo.badge}</p>
                    <p className="mt-1">{cancelInfo.label}</p>
                    {cancelInfo.reason && <p className="mt-1 text-xs text-primary">사유: {cancelInfo.reason}</p>}
                  </div>

                  {/* 요청 상태일 때만 승인/거절 버튼 노출 */}
                  {cancelInfo.status === 'requested' && (
                    <div className="mt-2 flex flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={isBusy}
                        onClick={async () => {
                          if (isBusy) return;
                          setBusyAction('approveCancel');
                          try {
                            await onApproveCancel();
                          } finally {
                            setBusyAction(null);
                          }
                        }}
                      >
                        {busyAction === 'approveCancel' ? '승인 처리중…' : '요청 승인'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-primary hover:bg-muted"
                        disabled={isBusy}
                        onClick={async () => {
                          if (isBusy) return;
                          setBusyAction('rejectCancel');
                          try {
                            await onRejectCancel();
                          } finally {
                            setBusyAction(null);
                          }
                        }}
                      >
                        {busyAction === 'rejectCancel' ? '거절 처리중…' : '요청 거절'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 연결 문서(공용 카드) */}
          {linkedDocs.length > 0 && (
            <LinkedDocsCard docs={linkedDocs} description="이 대여는 교체서비스 신청서와 연결되어 있습니다. 교체서비스 진행/상태는 신청서에서 확인하세요." className="border-0 shadow-xl ring-1 ring-ring" />
          )}

          <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden mb-8">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle>대여 상태 관리</CardTitle>
              <CardDescription>대여 상태를 변경하거나 보증금 환불을 처리할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <div className="flex gap-2 flex-wrap">
                {/* 결제완료 처리(무통장) – pending 상태에서만 노출 */}
                {canConfirmPayment && (
                  <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isBusy || confirming} onClick={onConfirmPayment}>
                    {confirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        결제 처리중…
                      </>
                    ) : (
                      '결제완료 처리(무통장)'
                    )}
                  </Button>
                )}

                {/* 대여 시작(out) */}
                <Button
                  size="sm"
                  className="h-9 bg-muted hover:bg-muted"
                  disabled={isBusy || data.status !== 'paid'}
                  onClick={() => {
                    if (isBusy) return;
                    setPendingAction('out');
                  }}
                >
                  {busyAction === 'out' ? '대여 시작 처리중…' : '대여 시작(out)'}
                </Button>

                {/* 반납 처리(return) */}
                <Button
                  size="sm"
                  className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isBusy || !['paid', 'out'].includes(data.status)}
                  onClick={() => {
                    if (isBusy) return;
                    setPendingAction('return');
                  }}
                >
                  {busyAction === 'return' ? '반납 처리중…' : '반납 처리(return)'}
                </Button>

                {/* 환불/해제 버튼 (아래는 기존 코드 그대로) */}
                {data.status === 'returned' &&
                  (data.depositRefundedAt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => {
                        if (isBusy) return;
                        setPendingAction('refundClear');
                      }}
                    >
                      {busyAction === 'refundClear' ? '환불 해제 중…' : '환불 해제'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => {
                        if (isBusy) return;
                        setPendingAction('refundMark');
                      }}
                    >
                      {busyAction === 'refundMark' ? '환불 처리 중…' : '환불 처리'}
                    </Button>
                  ))}
              </div>
            </CardFooter>
          </Card>
          {pendingDialogConfig && (
            <AdminConfirmDialog
              open={pendingAction !== null}
              onOpenChange={(open) => {
                if (!open) setPendingAction(null);
              }}
              onCancel={() => setPendingAction(null)}
              onConfirm={handleConfirmPendingAction}
              severity="danger"
              title={pendingDialogConfig.title}
              description={pendingDialogConfig.description}
              confirmText={pendingDialogConfig.confirmText}
              cancelText="취소"
              eventKey={pendingDialogConfig.eventKey}
              eventMeta={pendingDialogConfig.eventMeta}
            />
          )}
          <Card className="mt-8 border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle>고객 정보</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-sm space-y-3">
              <div>
                <span className="text-muted-foreground">이름</span>
                <div className="font-semibold">{data.user?.name || '-'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">이메일</span>
                <div className="font-semibold">{data.user?.email || '-'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">연락처</span>
                <div className="font-semibold">{data.user?.phone || '-'}</div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-destructive" />
                  <span>라켓 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/*
          금액 표시 정합성
          - 서버(/api/admin/rentals)가 amount.stringPrice / amount.stringingFee를 저장하므로
           관리자 상세에서도 해당 금액 근거를 그대로 노출시킴.
          - 대여만 한 케이스(스트링 미선택)는 UI가 지저분해지지 않도록 조건부 렌더링.
         */}
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">브랜드</p>
                      <p className="font-semibold text-foreground">{racketBrandLabel(data.brand)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">모델</p>
                      <p className="font-semibold text-foreground">{data.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">대여 기간</p>
                      <p className="font-semibold text-foreground">{data.days}일</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>결제 정보</span>
                </CardTitle>
                <div className="ml-auto">
                  {derivePaymentStatus(data) === 'paid' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">결제확정</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-primary text-xs">입금대기</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">대여 수수료</p>
                      <p className="font-semibold text-foreground">{won(data.amount?.fee)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                    <div>
                      <p className="text-sm text-muted-foreground">보증금</p>
                      <p className="font-semibold text-foreground">{won(data.amount?.deposit)}</p>
                    </div>
                  </div>
                  {/* 스트링 상품 금액: 있을 때만 표시 */}
                  {(data.amount?.stringPrice ?? 0) > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">스트링 상품</p>
                        <p className="font-semibold text-foreground">{won(data.amount?.stringPrice ?? 0)}</p>
                      </div>
                    </div>
                  )}

                  {/* 교체 서비스비(장착비): 있을 때만 표시 */}
                  {(data.amount?.stringingFee ?? 0) > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">교체 서비스비</p>
                        <p className="font-semibold text-foreground">{won(data.amount?.stringingFee ?? 0)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div>
                      <p className="text-sm text-muted-foreground">총 결제 금액</p>
                      <p className="text-xl font-bold text-primary dark:text-foreground">{won(data.amount?.total)}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/60 dark:bg-card/70">
                    <p className="text-sm font-medium text-muted-foreground mb-2">보증금 환불 계좌</p>
                    {data?.refundAccount ? (
                      <div className="space-y-1 text-sm">
                        <div>
                          은행: <b>{data.refundAccount.bank || '-'}</b>
                        </div>
                        <div>
                          예금주: <b>{data.refundAccount.holderMasked || '-'}</b>
                        </div>
                        <div>
                          계좌번호: <b>{data.refundAccount.accountMasked || '-'}</b>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">입력된 환불 계좌가 없습니다.</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const j = await adminFetcher<{ bank?: string; holder?: string; account?: string }>(`/api/admin/rentals/${id}/refund-account`, { cache: 'no-store' });
                        const text = `[${j.bank}] ${j.holder} / ${j.account}`;
                        await navigator.clipboard.writeText(text);
                        showSuccessToast('계좌 정보를 복사했습니다');
                      } catch {
                        showErrorToast('네트워크 오류');
                      }
                    }}
                  >
                    전체 계좌 보기/복사
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                운송장 정보
              </CardTitle>
              <div className="ml-auto">
                {
                  {
                    none: <span className="inline-flex px-2 py-0.5 rounded bg-muted text-foreground text-xs">운송장 없음</span>,
                    'outbound-set': <span className="inline-flex px-2 py-0.5 rounded bg-muted text-primary text-xs">출고 운송장</span>,
                    'return-set': <span className="inline-flex px-2 py-0.5 rounded bg-muted text-foreground text-xs">반납 운송장</span>,
                    'both-set': <span className="inline-flex px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">왕복 운송장</span>,
                  }[deriveShippingStatus(data)]
                }
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* 출고 */}
                <div className="p-4 rounded-lg border bg-muted/60 dark:bg-card/70">
                  <p className="text-sm font-medium text-muted-foreground mb-2">출고</p>
                  {data?.shipping?.outbound?.trackingNumber ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        택배사: <b>{courierLabel[data.shipping.outbound.courier] ?? data.shipping.outbound.courier ?? '-'}</b>
                      </div>
                      <div>
                        운송장:
                        <a className="underline underline-offset-2" href={courierTrackUrl[data.shipping.outbound.courier]?.(data.shipping.outbound.trackingNumber) ?? '#'} target="_blank" rel="noreferrer">
                          {data.shipping.outbound.trackingNumber}
                        </a>
                      </div>
                      <div>
                        출고일: <b>{fmtDateOnly(data.shipping.outbound.shippedAt)}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">미등록</div>
                  )}
                </div>
                {/* 반납 */}
                <div className="p-4 rounded-lg border bg-muted/60 dark:bg-card/70">
                  <p className="text-sm font-medium text-muted-foreground mb-2">반납</p>
                  {data?.shipping?.return?.trackingNumber ? (
                    <div className="space-y-1 text-sm">
                      <div>
                        택배사: <b>{courierLabel[data.shipping.return.courier] ?? data.shipping.return.courier ?? '-'}</b>
                      </div>
                      <div>
                        운송장:
                        <a className="underline underline-offset-2" href={courierTrackUrl[data.shipping.return.courier]?.(data.shipping.return.trackingNumber) ?? '#'} target="_blank" rel="noreferrer">
                          {data.shipping.return.trackingNumber}
                        </a>
                      </div>
                      <div>
                        발송일: <b>{fmtDateOnly(data.shipping.return.shippedAt)}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">미등록</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl ring-1 ring-ring bg-muted/30 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>대여 타임라인</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">대여 시작</p>
                    <p className="font-semibold text-foreground">{data.outAt ? formatDate(data.outAt) : '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">반납 예정</p>
                    <p className="font-semibold text-foreground">{data.dueAt ? formatDate(data.dueAt) : '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">반납 완료</p>
                    <p className="font-semibold text-foreground">{data.returnedAt ? formatDate(data.returnedAt) : '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border/60">
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">보증금 환불</p>
                    <p className="font-semibold text-foreground">{data.depositRefundedAt ? formatDate(data.depositRefundedAt) : '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <AdminRentalHistory id={id} />
        </div>
      </div>
    </div>
  );
}
