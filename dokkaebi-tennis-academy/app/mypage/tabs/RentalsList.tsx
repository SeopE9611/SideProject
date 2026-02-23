'use client';

import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CreditCard, Package, ArrowRight, Briefcase, CheckCircle, AlertCircle, XCircle, Undo2 } from 'lucide-react';
import { useMemo } from 'react';
import { racketBrandLabel } from '@/lib/constants';
import CancelRentalDialog from '@/app/mypage/rentals/_components/CancelRentalDialog';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const LIMIT = 5;

const getKey = (index: number, prev: any) => {
  if (prev && prev.items && prev.items.length < LIMIT) return null;
  const page = index + 1;
  return `/api/me/rentals?page=${page}&pageSize=${LIMIT}`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'returned':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case 'out':
      return <Clock className="h-4 w-4 text-primary" />;
    case 'paid':
      return <Package className="h-4 w-4 text-foreground" />;
    case 'canceled':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'returned':
      return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    case 'out':
      return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    case 'paid':
      return 'bg-muted text-foreground dark:bg-muted dark:text-foreground';
    case 'canceled':
      return 'bg-destructive/10 text-destructive dark:bg-destructive/15';
    default:
      return 'bg-muted text-foreground dark:bg-card dark:text-foreground';
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export default function RentalsList() {
  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite(getKey, fetcher);

  const handleWithdrawCancelRequest = async (rentalId: string) => {
    if (!confirm('대여 취소 요청을 철회하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/rentals/${rentalId}/cancel-withdraw`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.message || '대여 취소 요청 철회 중 오류가 발생했습니다.';
        showErrorToast(msg);
        return;
      }

      showSuccessToast('대여 취소 요청을 철회했습니다.');

      // 목록 전체를 다시 불러와서 해당 카드의 cancelStatus를 최신으로 맞춤
      await mutate();
    } catch (e) {
      console.error(e);
      showErrorToast('대여 취소 요청 철회 중 오류가 발생했습니다.');
    }
  };

  const flat = useMemo(() => (data ?? []).flatMap((d: any) => d.items ?? []), [data]);

  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  if (error) {
    return (
      <Card className="border-0 bg-card">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15">
            <Briefcase className="h-8 w-8" />
          </div>
          <p className="font-semibold text-destructive">대여 내역을 불러오는 중 오류가 발생했습니다.</p>
          <p className="mt-1 text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        </CardContent>
      </Card>
    );
  }

  // 첫 로딩
  if (!data && isValidating) {
    return <div className="text-center py-8 text-muted-foreground">대여 내역을 불러오는 중입니다...</div>;
  }

  if (!isValidating && flat.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-muted/30 dark:bg-card/40">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-background to-card dark:from-background dark:to-card shadow-lg">
            <Briefcase className="h-10 w-10 text-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">대여 내역이 없습니다</h3>
          <p className="text-muted-foreground">아직 대여하신 라켓이 없습니다. 지금 바로 라켓을 대여해보세요!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {flat.map((r: any) => (
        <Card
          key={r.id}
          className={`group relative overflow-hidden border-0 bg-card shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1
            ${r.stringingApplicationId || r.withStringService ? 'ring-1 ring-ring' : ''}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background via-muted to-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-card rounded-lg" />
          </div>

          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-background to-card dark:from-background dark:to-card shadow-lg">
                  <Briefcase className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {racketBrandLabel(r.brand)} {r.model}
                    </h3>

                    {/* 교체 신청서가 연결된 대여임을 한눈에 표시 */}
                    {r.stringingApplicationId ? (
                      <span className="shrink-0 rounded-full border border-border bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:border-border dark:bg-primary/20 dark:text-primary">신청서 연결됨</span>
                    ) : r.withStringService ? (
                      <span className="shrink-0 rounded-full border border-border bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:border-border dark:bg-primary/20 dark:text-primary">교체 서비스 포함</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    대여 기간: {r.days}일
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusIcon(r.status)}
                <Badge className={`px-3 py-1 text-xs font-medium ${getStatusBadgeColor(r.status)}`}>{getStatusLabel(r.status)}</Badge>
                {r.cancelStatus === 'requested' && <Badge className="bg-muted text-primary dark:bg-muted dark:text-primary border border-border">취소 요청됨</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">대여 기간</div>
                  <div className="font-medium text-foreground">{r.days}일</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">대여 수수료</div>
                  <div className="font-medium text-foreground">{r.amount?.fee?.toLocaleString() ?? 0}원</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">보증금</div>
                  <div className="font-medium text-foreground">{r.amount?.deposit?.toLocaleString() ?? 0}원</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border/60 dark:border-border/60">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">총 {((r.amount?.fee ?? 0) + (r.amount?.deposit ?? 0)).toLocaleString()}원</span>
                {r.hasReturnShipping ? <Badge className="bg-primary/10 text-primary border border-border dark:bg-primary/20 dark:text-primary">반납 운송장 등록됨</Badge> : <Badge variant="secondary">반납 운송장 미등록</Badge>}
              </div>

              {/* Desktop (sm 이상): 기존 동작 유지 */}
              <div className="hidden sm:flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="outline" asChild className="hover:border-border dark:hover:bg-muted bg-transparent">
                  <Link href={`/mypage?tab=rentals&rentalId=${r.id}`} className="inline-flex items-center gap-1">
                    상세보기
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>

                {/* 대여 기반 교체 신청서가 있으면: 신청서 상세로 바로 이동 */}
                {r.stringingApplicationId ? (
                  <Button size="sm" variant="outline" asChild className="hover:border-border hover:bg-primary/10 dark:hover:bg-primary/20 bg-transparent">
                    <Link href={`/mypage?tab=applications&applicationId=${r.stringingApplicationId}`} className="inline-flex items-center gap-1">
                      신청서 보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : r.withStringService ? (
                  // 교체 서비스가 포함된 대여인데 아직 신청서가 없다면: 바로 신청서 작성으로 유도
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200" asChild>
                    <Link href={`/services/apply?rentalId=${r.id}`} className="inline-flex items-center gap-1">
                      교체 신청하기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : null}

                {r.cancelStatus === 'requested' && (
                  <Button size="sm" variant="destructive" onClick={() => handleWithdrawCancelRequest(r.id)} className="gap-2">
                    <Undo2 className="h-4 w-4" />
                    대여 취소 요청 철회
                  </Button>
                )}
                {['pending', 'paid'].includes(r.status) && !r.hasOutboundShipping && r.cancelStatus !== 'requested' && (
                  <CancelRentalDialog
                    rentalId={r.id}
                    onSuccess={async () => {
                      await mutate(); // 목록 다시 불러오기
                    }}
                  />
                )}
              </div>

              {/* Mobile (sm 미만): 핵심 CTA를 1줄 그리드로 고정 */}
              <div className="grid sm:hidden grid-cols-12 items-center gap-2 w-full">
                {/* 상세보기: (신청서 보기 / 교체 신청하기) 2차 CTA가 있으면 6칸, 없으면 12칸 */}
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className={`${r.stringingApplicationId || (r.withStringService && !r.stringingApplicationId) ? 'col-span-6' : 'col-span-12'} w-full hover:border-border dark:hover:bg-muted bg-transparent`}
                >
                  <Link href={`/mypage?tab=rentals&rentalId=${r.id}`} className="inline-flex w-full items-center justify-center gap-1">
                    상세보기
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>

                {/* 신청서 보기: 있을 때만 노출 */}
                {r.stringingApplicationId ? (
                  <Button size="sm" variant="outline" asChild className="col-span-6 w-full hover:border-border hover:bg-primary/10 dark:hover:bg-primary/20 bg-transparent">
                    <Link href={`/mypage?tab=applications&applicationId=${r.stringingApplicationId}`} className="inline-flex w-full items-center justify-center gap-1">
                      신청서 보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : r.withStringService ? (
                  <Button size="sm" className="col-span-6 w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200" asChild>
                    <Link href={`/services/apply?rentalId=${r.id}`} className="inline-flex w-full items-center justify-center gap-1">
                      교체 신청하기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : null}

                {/* 취소 관련 액션은 모바일에서 아래 줄(12칸)로 내려 레이아웃 안정화 */}
                {r.cancelStatus === 'requested' ? (
                  <Button size="sm" variant="destructive" onClick={() => handleWithdrawCancelRequest(r.id)} className="col-span-12 w-full gap-2">
                    <Undo2 className="h-4 w-4" />
                    대여 취소 요청 철회
                  </Button>
                ) : ['pending', 'paid'].includes(r.status) && !r.hasOutboundShipping ? (
                  <div className="col-span-12">
                    <CancelRentalDialog
                      rentalId={r.id}
                      onSuccess={async () => {
                        await mutate(); // 목록 다시 불러오기
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center pt-4">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating} className="border-border hover:bg-muted dark:hover:bg-muted bg-transparent">
            {isValidating ? '불러오는 중…' : '더 보기'}
          </Button>
        ) : flat.length ? (
          <span className="text-sm text-muted-foreground">마지막 페이지입니다</span>
        ) : null}
      </div>
    </div>
  );
}
