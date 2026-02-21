'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, Search, ClipboardCheck, Edit2, MessageSquare, DollarSign, User, Truck, Package, Calendar } from 'lucide-react';

const LIMIT = 5;
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function getIconProps(status: string) {
  switch (status.trim()) {
    // 기본 신청 상태
    case '접수완료':
    case '접수 완료':
      return {
        Icon: ClipboardCheck,
        wrapperClasses: 'border-border bg-warning/10 ' + 'dark:border-border dark:bg-warning/10',
        iconClasses: 'text-warning dark:text-warning',
      };

    case '검토 중':
      return {
        Icon: Search,
        wrapperClasses: 'border-border bg-primary ' + 'dark:border-border dark:bg-primary',
        iconClasses: 'text-primary dark:text-primary',
      };
    case '작업 중':
      return {
        Icon: Edit2,
        wrapperClasses: 'border-border bg-muted ' + 'dark:border-border dark:bg-muted',
        iconClasses: 'text-foreground dark:text-foreground',
      };
    case '교체완료':
    case '교체 완료':
      return {
        Icon: CheckCircle,
        wrapperClasses: 'border-border bg-success/10 ' + 'dark:border-border dark:bg-success/10',
        iconClasses: 'text-success dark:text-success',
      };
    case '취소':
      return {
        Icon: XCircle,
        wrapperClasses: 'border-destructive bg-destructive ' + 'dark:border-destructive dark:bg-destructive',
        iconClasses: 'text-destructive dark:text-destructive',
      };

    // 커스텀 이력 항목
    // 커스텀 이력 항목
    case '고객정보수정':
      return {
        Icon: User,
        wrapperClasses: 'border-border bg-muted ' + 'dark:border-border dark:bg-muted',
        iconClasses: 'text-foreground dark:text-foreground',
      };
    case '요청사항 수정':
      return {
        Icon: MessageSquare,
        wrapperClasses: 'border-border bg-muted ' + 'dark:border-border dark:bg-muted',
        iconClasses: 'text-foreground dark:text-foreground',
      };
    case '스트링 정보 수정':
      return {
        Icon: Edit2,
        wrapperClasses: 'border-border bg-primary ' + 'dark:border-border dark:bg-primary',
        iconClasses: 'text-primary dark:text-primary',
      };
    case '결제 금액 자동 업데이트':
      return {
        Icon: DollarSign,
        wrapperClasses: 'border-border bg-success/10 ' + 'dark:border-border dark:bg-success/10',
        iconClasses: 'text-success dark:text-success',
      };

    // 자가 발송(사용자 → 매장) 운송장 관련
    case '자가발송 운송장 등록':
    case '자가발송 운송장 수정':
      return {
        Icon: Truck,
        wrapperClasses: 'border-border bg-success/10 ' + 'dark:border-border dark:bg-success/10',
        iconClasses: 'text-success dark:text-success',
      };

    // 매장 발송(매장 → 사용자) 운송장 관련
    case '매장 발송 운송장 등록':
    case '매장 발송 운송장 수정':
      return {
        Icon: Package,
        wrapperClasses: 'border-border bg-primary ' + 'dark:border-border dark:bg-primary',
        iconClasses: 'text-primary dark:text-primary',
      };
    // 매장 발송 정보(방식/예정일/운송장 통합 로그)
    case '매장 발송 정보 등록':
    case '매장 발송 정보 수정':
      return {
        Icon: Clock,
        wrapperClasses: 'border-border bg-muted ' + 'dark:border-border dark:bg-muted',
        iconClasses: 'text-foreground',
      };

    // default
    default:
      return {
        Icon: Clock,
        wrapperClasses: 'border-border bg-muted ' + 'dark:border-border dark:bg-muted',
        iconClasses: 'text-foreground',
      };
  }
}

interface HistoryItem {
  status: string;
  date: string;
  description: string;
}

interface HistoryResponse {
  history: HistoryItem[];
  total: number;
}

export default function StringingApplicationHistory({ applicationId, onHistoryMutate }: { applicationId: string; onHistoryMutate?: (mutateFn: () => Promise<any>) => void }) {
  const [page, setPage] = useState(1);
  const url = `/api/applications/stringing/${applicationId}/history?page=${page}&limit=${LIMIT}`;

  const {
    data: res,
    isValidating,
    mutate: mutateHistory,
  } = useSWR<HistoryResponse>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (onHistoryMutate) onHistoryMutate(mutateHistory);
  }, [mutateHistory, onHistoryMutate]);

  const isLoading = !res && isValidating;
  const history = res?.history ?? [];
  const total = res?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const historyItems = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="md:col-span-3 rounded-xl border border-border/60 bg-card text-card-foreground shadow-md dark:bg-card">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/30 dark:bg-card rounded-t-xl">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-foreground" />
          <CardTitle className="text-2xl font-semibold">처리 이력</CardTitle>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">최신 변경이 맨 위에 표시됩니다.</p>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="flex animate-pulse space-x-4 py-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))
        ) : historyItems.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">아직 처리 이력이 없습니다.</div>
        ) : (
          historyItems.map((log, idx) => {
            const { Icon, wrapperClasses, iconClasses } = getIconProps(log.status);
            return (
              <div key={idx} className={`flex space-x-4 py-3 ${idx === 0 ? 'rounded-lg bg-muted dark:bg-card px-3 -mx-3' : ''}`}>
                <div className={`h-10 w-10 flex items-center justify-center rounded-full border ${wrapperClasses}`}>
                  <Icon className={`h-6 w-6 ${iconClasses}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-semibold">{log.status}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(log.date))}
                    </span>
                  </div>
                  {(() => {
                    // "문장 (추가정보...)" 형태를 앞/뒤로 나누기
                    const [main, detailWithParen] = log.description.split('(', 2);
                    const detail = detailWithParen ? detailWithParen.replace(/\)$/, '') : '';

                    return (
                      <p className="mt-1 text-sm text-foreground">
                        {main?.trim()}
                        {detail && <span className="ml-1 font-medium text-primary dark:text-primary">({detail})</span>}
                      </p>
                    );
                  })()}
                </div>
              </div>
            );
          })
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-3">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              다음
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
