'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Phone, User, RatIcon as Racquet, Zap, GraduationCap, ArrowRight, FileText, Target, LayoutGrid, RocketIcon, Gauge, CheckCircle, Delete, Ban, XCircle, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import { showInfoToast, showSuccessToast, showErrorToast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import CancelStringingDialog from './CancelStringingDialog';
import { MdSportsTennis } from 'react-icons/md';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Application {
  id: string;
  type: '스트링 장착 서비스' | '아카데미 수강 신청';
  applicantName: string;
  phone: string;
  appliedAt: string;
  status: '접수완료' | '검토 중' | '작업 중' | '교체완료';
  racketType?: string;
  stringType?: string;
  preferredDate?: string;
  preferredTime?: string;

  visitSlotCount?: number | null;
  visitDurationMinutes?: number | null;

  course?: string;
  schedule?: string;
  hasTracking: boolean;
  cancelStatus?: string; // '요청' | '승인' | '거절' | 'none'
  cancelReasonSummary?: string | null;

  // /api/applications/me 에서 내려주는 파생값
  inboundRequired?: boolean; // 고객→매장 입고 필요 여부
  needsInboundTracking?: boolean; // 입고가 필요하고 + 자가발송(self_ship)이라 운송장 입력이 필요한지

  // 이 신청이 어떤 주문에서 생성되었는지 연결 정보
  orderId?: string | null;
  rentalId?: string | null;

  // 사용자 확정 시각(없으면 null) - 교체확정 완료 여부 판단용
  userConfirmedAt?: string | null;
}

type AppResponse = { items: Application[]; total: number };

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// --- 희망 일시 포맷터 (방문 예약 전용) ---

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatVisitTimeRange = (preferredDate?: string, preferredTime?: string, durationMinutes?: number | null, slotCount?: number | null): string => {
  if (!preferredDate || !preferredTime) {
    return '예약 일시 미입력';
  }

  const [hh, mm] = preferredTime.split(':');
  const h = Number(hh);
  const m = Number(mm);

  if (!Number.isFinite(h) || !Number.isFinite(m) || !durationMinutes || durationMinutes <= 0) {
    // duration 없으면 예전처럼 시작 시각만
    return `${preferredDate} ${preferredTime}`;
  }

  const startTotal = h * 60 + m;
  const endTotal = startTotal + durationMinutes;

  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTimeStr = `${pad2(endH)}:${pad2(endM)}`;

  const baseRange = `${preferredDate} ${preferredTime} ~ ${endTimeStr}`;

  if (slotCount && slotCount > 0) {
    return `${baseRange} (${slotCount}슬롯 / 총 ${durationMinutes}분)`;
  }
  return `${baseRange} (총 ${durationMinutes}분)`;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('데이터 로딩 실패');
  return res.json();
};

const LIMIT = 5;

// 신청 상태별 아이콘
const getApplicationStatusIcon = (status: Application['status']) => {
  switch (status) {
    case '검토 중':
      return <Clock className="h-4 w-4 text-warning" />;
    case '접수완료':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case '작업 중':
      return <Clock className="h-4 w-4 text-foreground" />;
    case '교체완료':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    default:
      return <Ban className="h-4 w-4 text-destructive" />;
  }
};

export default function ApplicationsClient() {
  const router = useRouter();

  const { mutate: globalMutate } = useSWRConfig();
  // 교체확정 요청 중(신청서별로 1개만)
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // SWR Infinite 키 생성
  const getKey = (pageIndex: number, previousPageData: AppResponse | null) => {
    // 직전 페이지가 LIMIT 미만이면 다음 페이지 없음
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT) return null;

    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(LIMIT));

    // 필터/검색 대비용
    // if (statusFilter) params.set('status', statusFilter);
    // if (keyword) params.set('q', keyword);
    // if (dateFrom) params.set('dateFrom', dateFrom);

    return `/api/applications/me?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite<AppResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
  });

  // 취소 요청 Dialog 제어용 상태
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const handleOpenCancel = (id: string) => {
    setTargetId(id);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (params: { reasonCode: string; reasonText?: string }) => {
    if (!targetId) return;

    try {
      setIsCancelSubmitting(true);

      const res = await fetch(`/api/applications/stringing/${targetId}/cancel-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || '취소 요청 처리 중 오류가 발생했습니다.';
        showErrorToast(msg);
        return;
      }

      showSuccessToast('취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다.');

      // Dialog 닫기 + 선택된 ID 초기화
      setCancelDialogOpen(false);
      setTargetId(null);

      // 목록 재검증(취소 요청 뱃지/버튼 상태 갱신)
      await mutate();
    } catch (error) {
      console.error(error);
      showErrorToast('취소 요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const handleWithdrawCancelRequest = async (applicationId: string) => {
    if (!confirm('이 신청의 취소 요청을 철회하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/applications/${applicationId}/cancel-request-withdraw`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || '취소 요청 철회 중 오류가 발생했습니다.';
        showErrorToast(msg);
        return;
      }

      showSuccessToast('신청 취소 요청을 철회했습니다.');

      // 신청 목록 전체 재검증 → 취소 요청 뱃지/버튼 상태 갱신
      await mutate();
    } catch (e) {
      console.error(e);
      showErrorToast('취소 요청 철회 중 오류가 발생했습니다.');
    }
  };

  // 교체확정(사용자) - 교체완료 상태에서만 가능
  const handleConfirmService = async (applicationId: string) => {
    if (confirmingId) return;

    const ok = confirm('교체확정을 진행할까요?\n\n확정 후에는 포인트가 지급되며, 되돌릴 수 없습니다.');
    if (!ok) return;

    try {
      setConfirmingId(applicationId);

      const res = await fetch(`/api/applications/stringing/${applicationId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(data?.message || data?.error || '교체확정 처리 중 오류가 발생했습니다.');
        return;
      }

      if (data?.already) {
        showSuccessToast(data?.message || '이미 교체확정된 신청입니다.');
      } else {
        const earned = Number(data?.earnedPoints ?? 0);
        showSuccessToast(earned > 0 ? `교체확정 완료 (+${earned}P 적립)` : '교체확정 완료');
      }

      // 신청 목록 재검증
      await mutate();

      // 다른 탭(포인트/주문)도 UX상 갱신되도록 재검증
      await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/points/me'), undefined, { revalidate: true });
      await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/users/me/orders'), undefined, { revalidate: true });
    } catch (e) {
      console.error(e);
      showErrorToast('교체확정 처리 중 오류가 발생했습니다.');
    } finally {
      setConfirmingId(null);
    }
  };

  // 누적 리스트
  const applications = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);

  // 더 보기 여부
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  // 에러
  if (error) {
    return <p className="text-center py-4 text-destructive">에러: {error.message}</p>;
  }

  // 첫 로딩
  if (!data && isValidating) {
    return <div className="text-center py-8 text-muted-foreground">신청 내역을 불러오는 중입니다...</div>;
  }

  return (
    <div className="space-y-6">
      {applications.length === 0 ? (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-background to-muted dark:from-background dark:to-muted">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-background to-card dark:from-background dark:to-card">
              <FileText className="h-10 w-10 text-success" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">신청 내역이 없습니다</h3>
            <p className="mb-6 text-muted-foreground">아직 신청하신 서비스가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        applications.map((app) => {
          const isStringService = app.type === '스트링 장착 서비스';
          // collectionMethod는 "방문/자가발송" 라벨 표시에만 사용 (버튼 노출 조건은 needsInboundTracking 사용)
          const cm = normalizeCollection((app as any).collectionMethod ?? (app as any).shippingInfo?.collectionMethod);

          // Step1에서 내려준 파생값(고증 보정 핵심)
          // - inboundRequired=false  : 주문(라켓 포함)/대여 기반 → 고객이 보낼 필요 없음
          // - needsInboundTracking=true : 고객 자가발송 케이스 → 운송장 등록 UI 필요
          const inboundRequired = isStringService ? Boolean((app as any).inboundRequired) : false;
          const needsInboundTracking = isStringService ? Boolean((app as any).needsInboundTracking) : false;

          // 자가발송(운송장 입력이 필요한 경우에만 true)
          const isSelfShip = isStringService && needsInboundTracking;
          const isVisit = isStringService && cm === 'visit';

          // 방문 예약 희망 일시 라벨 (목록 카드용)
          const visitTimeLabel =
            isStringService && isVisit && app.preferredDate && app.preferredTime ? formatVisitTimeRange(app.preferredDate, app.preferredTime, app.visitDurationMinutes ?? null, app.visitSlotCount ?? null).replace(/-/g, '.') : null;

          // 라벨 고증에 맞게 보정
          const collectionLabel = !isStringService ? null : !inboundRequired ? '수령 방법: 입고 불필요(주문/대여 기반)' : cm === 'self_ship' ? '수령 방법: 자가 발송(택배)' : cm === 'visit' ? '수령 방법: 매장 방문' : '수령 방법: 기타';

          // 운송장 등록 여부
          const hasTracking = app.hasTracking;
          // 연결된 주문/대여 ID
          const orderId = (app as any).orderId as string | null | undefined;
          const rentalId = (app as any).rentalId as string | null | undefined;

          // 우선순위: 주문 기반(orderId) > 대여 기반(rentalId)
          const hasOrderLink = Boolean(orderId);
          const hasRentalLink = !hasOrderLink && Boolean(rentalId);

          // 종료 상태(수정 금지)
          const CLOSED = ['작업 중', '교체완료'];
          const isClosed = CLOSED.includes(String((app as any).status));

          // 취소 상태 계산 (한글/영문 둘 다 대응)
          const rawCancelStatus = app.cancelStatus ?? 'none';
          const isCancelRequested = rawCancelStatus === '요청' || rawCancelStatus === 'requested';
          const isCancelRejected = rawCancelStatus === '거절' || rawCancelStatus === 'rejected';

          // 취소 요청 가능 여부
          const isCancelable = isStringService && ['접수완료', '검토 중'].includes(app.status) && !isCancelRequested; // 요청 상태가 아니면 언제든 다시 취소 요청 가능
          return (
            <Card key={app.id} className="group relative overflow-hidden border-0 bg-card shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-background via-muted to-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
                <div className="h-full w-full bg-card rounded-lg" />
              </div>

              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        isStringService ? 'bg-gradient-to-br from-background to-card dark:from-background dark:to-card' : 'bg-gradient-to-br from-background to-card dark:from-background dark:to-card'
                      }`}
                    >
                      {isStringService ? (
                        <LayoutGrid className={`h-6 w-6  ${isStringService ? 'text-warning' : 'text-success'}`} />
                      ) : (
                        <GraduationCap className="h-6 w-6 text-success" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{app.type}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(app.appliedAt)}
                      </div>

                      {/* 이 신청이 어떤 주문에서 생성되었는지 링크 */}
                      {hasOrderLink && orderId && (
                        <div className="mt-1 flex items-center gap-2">
                          <Link href={`/mypage?tab=orders&orderId=${orderId}`}>
                            <Badge
                              variant="outline"
                              className="border-border bg-muted/80 text-[11px] font-medium text-foreground
          dark:border-border dark:bg-card/40 dark:text-foreground hover:bg-muted dark:hover:bg-card"
                            >
                              원 주문 상세 보기
                            </Badge>
                          </Link>
                          <span className="text-[11px] text-muted-foreground">주문 ID 끝자리 {orderId.slice(-6)}</span>
                        </div>
                      )}

                      {/* 이 신청이 어떤 대여에서 생성되었는지 링크 */}
                      {hasRentalLink && rentalId && (
                        <div className="mt-1 flex items-center gap-2">
                          <Link href={`/mypage?tab=rentals&rentalId=${rentalId}`}>
                            <Badge variant="outline" className="border-border text-foreground hover:bg-muted">
                              원 대여 상세 보기
                            </Badge>
                          </Link>
                          <span className="text-xs text-muted-foreground">대여 ID 끝자리 {rentalId.slice(-6)}</span>
                        </div>
                      )}

                      {collectionLabel && <div className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-card dark:text-muted-foreground">{collectionLabel}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getApplicationStatusIcon(app.status)}
                    <ApplicationStatusBadge status={app.status} />

                    {(() => {
                      const raw = app.cancelStatus ?? 'none';
                      const isRequested = raw === '요청' || raw === 'requested';
                      if (!isRequested) return null;

                      return (
                        <Badge
                          variant="outline"
                          className="ml-1 border-border bg-muted text-[11px] font-medium text-primary
        dark:border-border dark:bg-muted dark:text-primary"
                        >
                          취소 요청됨
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {isStringService ? (
                    <>
                      {/* 방문 수령(매장 방문)일 때만 희망일시 카드 표시 */}
                      {isVisit && app.preferredDate && app.preferredTime && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">매장 방문 희망일시</div>
                            <div className="font-medium text-foreground">{visitTimeLabel}</div>
                          </div>
                        </div>
                      )}

                      {/* 라켓 & 스트링 정보 (핵심 정보만 표시) */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <MdSportsTennis className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">라켓 & 스트링</div>
                          <div className="font-medium text-foreground">
                            {app.racketType ?? '-'} / {app.stringType ?? '-'}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">이름</div>
                          <div className="font-medium text-foreground">{app.applicantName}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">연락처</div>
                          <div className="font-medium text-foreground">{app.phone}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">코스 & 일정</div>
                          <div className="font-medium text-foreground">
                            {app.course ?? '-'} / {app.schedule ?? '-'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border/60 dark:border-border/60">
                  {/* 간단한 신청 정보 요약 */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{app.type}</span>
                  </div>

                  {/* 상세/운송장/취소 요청 버튼들 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/mypage?tab=applications&applicationId=${app.id}`)}
                      className="border-border hover:border-border hover:bg-success/10 dark:border-border dark:hover:border-border dark:hover:bg-success/10 transition-colors"
                    >
                      상세보기
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>

                    {isSelfShip &&
                      (isClosed ? (
                        <Button variant="outline" size="sm" onClick={() => showInfoToast('이미 종료된 신청서입니다. 운송장 수정이 불가합니다.')}>
                          운송장 수정하기
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => router.push(`/services/applications/${app.id}/shipping?return=${encodeURIComponent('/mypage?tab=applications')}`)}>
                          {hasTracking ? '운송장 수정하기' : '운송장 등록하기'}
                        </Button>
                      ))}

                    {/* 교체확정(항상 노출) - 스트링 장착 서비스에만 표시 */}
                    {isStringService && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* disabled 버튼에서도 Tooltip이 뜨도록 span으로 감싼다 */}
                            <span className="inline-block">
                              {(() => {
                                const userConfirmedAt = (app as any).userConfirmedAt ?? null;
                                const isUserConfirmed = Boolean(userConfirmedAt);

                                const canConfirm = app.status === '교체완료' && !isUserConfirmed && !isCancelRequested && confirmingId !== app.id;

                                const label = confirmingId === app.id ? '확정 중…' : isUserConfirmed ? '교체확정 완료' : '교체확정';

                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!canConfirm}
                                    onClick={() => handleConfirmService(app.id)}
                                    className="border-border hover:border-border hover:bg-primary/10 dark:border-border dark:hover:bg-primary/20 transition-colors"
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    {label}
                                  </Button>
                                );
                              })()}
                            </span>
                          </TooltipTrigger>

                          <TooltipContent>
                            {(() => {
                              const userConfirmedAt = (app as any).userConfirmedAt ?? null;
                              const isUserConfirmed = Boolean(userConfirmedAt);

                              if (confirmingId === app.id) return <p>교체확정 처리 중입니다.</p>;
                              if (isUserConfirmed) return <p>이미 교체확정된 신청입니다.</p>;
                              if (isCancelRequested) return <p>취소 요청 처리 중에는 확정할 수 없습니다.</p>;
                              if (app.status !== '교체완료') return <p>교체완료 상태에서만 교체확정이 가능합니다.</p>;

                              // 활성 상태일 때도 안내 문구는 하나 넣어두면 UX가 좋아짐
                              return <p>교체확정 시 포인트가 지급됩니다.</p>;
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {isCancelRequested ? (
                      <Button variant="destructive" size="sm" onClick={() => handleWithdrawCancelRequest(app.id)} className="gap-2">
                        <Undo2 className="h-4 w-4" />
                        신청 취소 요청 철회
                      </Button>
                    ) : (
                      isCancelable && (
                        <Button variant="destructive" size="sm" onClick={() => handleOpenCancel(app.id)} className="gap-2">
                          <XCircle className="h-4 w-4" />
                          신청 취소 요청
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* '더 보기' 버튼 */}
      <div className="mt-6 flex justify-center items-center">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            {isValidating ? '불러오는 중…' : '더 보기'}
          </Button>
        ) : applications.length ? (
          <span className="text-sm text-muted-foreground">마지막 페이지입니다</span>
        ) : null}
      </div>

      {/* 목록 전용 스트링 취소 요청 Dialog (선택된 신청서 기준) */}
      <CancelStringingDialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) {
            setTargetId(null);
          }
        }}
        onConfirm={handleConfirmCancel}
        isSubmitting={isCancelSubmitting}
      />
    </div>
  );
}
