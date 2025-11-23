'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Phone, User, RatIcon as Racquet, Zap, GraduationCap, ArrowRight, FileText, Target, LayoutGrid, RocketIcon, Gauge, CheckCircle, Delete, Ban, XCircle, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { useMemo, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import ServiceReviewCTA from '@/components/reviews/ServiceReviewCTA';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import { showInfoToast, showSuccessToast, showErrorToast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import CancelStringingDialog from './CancelStringingDialog';
import { MdSportsTennis } from 'react-icons/md';
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
  course?: string;
  schedule?: string;
  hasTracking: boolean;
  cancelStatus?: string; // '요청' | '승인' | '거절' | 'none'
  cancelReasonSummary?: string | null;
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
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case '접수완료':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case '작업 중':
      return <Clock className="h-4 w-4 text-sky-500" />;
    case '교체완료':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    default:
      return <Ban className="h-4 w-4 text-red-500" />;
  }
};

export default function ApplicationsClient() {
  const router = useRouter();

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
    return <p className="text-center py-4 text-red-500">에러: {error.message}</p>;
  }

  // 첫 로딩
  if (!data && isValidating) {
    return <div className="text-center py-8 text-muted-foreground">신청 내역을 불러오는 중입니다...</div>;
  }

  return (
    <div className="space-y-6">
      {applications.length === 0 ? (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900">
              <FileText className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">신청 내역이 없습니다</h3>
            <p className="mb-6 text-slate-600 dark:text-slate-400">아직 신청하신 서비스가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        applications.map((app) => {
          const isStringService = app.type === '스트링 장착 서비스';
          // 자가발송 여부(신청서/배송정보 양쪽 필드 중 하나라도 기준 충족 시 true)
          const cm = normalizeCollection((app as any).collectionMethod ?? (app as any).shippingInfo?.collectionMethod);
          const isSelfShip = isStringService && cm === 'self_ship';
          const isVisit = isStringService && cm === 'visit';
          const collectionLabel = !isStringService ? null : cm === 'self_ship' ? '수령 방법: 자가 발송(택배)' : cm === 'visit' ? '수령 방법: 매장 방문' : '수령 방법: 기타';
          // 운송장 등록 여부
          const hasTracking = app.hasTracking;
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
            <Card key={app.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
                <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
              </div>

              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        isStringService ? 'bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900' : 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900'
                      }`}
                    >
                      {isStringService ? (
                        <LayoutGrid className={`h-6 w-6  ${isStringService ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
                      ) : (
                        <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{app.type}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(app.appliedAt)}
                      </div>

                      {collectionLabel && <div className="mt-1 inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{collectionLabel}</div>}
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
                          className="ml-1 border-amber-200/60 bg-amber-50/80 text-[11px] font-medium text-amber-800
        dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-200"
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
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">매장 방문 희망일시</div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {app.preferredDate.replace(/-/g, '.')} {app.preferredTime}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 라켓 & 스트링 정보 (핵심 정보만 표시) */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <MdSportsTennis className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">라켓 & 스트링</div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {app.racketType ?? '-'} / {app.stringType ?? '-'}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">이름</div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{app.applicantName}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <Phone className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">연락처</div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{app.phone}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <GraduationCap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">코스 & 일정</div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {app.course ?? '-'} / {app.schedule ?? '-'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {/* 간단한 신청 정보 요약 */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <FileText className="h-4 w-4" />
                    <span>{app.type}</span>
                  </div>

                  {/* 상세/운송장/취소 요청 버튼들 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/mypage?tab=applications&applicationId=${app.id}`)}
                      className="border-slate-200 hover:border-green-500 hover:bg-green-50 dark:border-slate-700 dark:hover:border-green-600 dark:hover:bg-green-950 transition-colors"
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
          <span className="text-sm text-slate-500">마지막 페이지입니다</span>
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
