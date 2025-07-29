'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, Search, ClipboardCheck, Edit2, MessageSquare, DollarSign, User } from 'lucide-react';
import { HistorySkeleton } from '@/app/features/orders/components/HistorySkeleton';

const LIMIT = 5;
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function getIconProps(status: string) {
  switch (status.trim()) {
    // 기본 신청 상태
    case '접수완료':
    case '접수 완료':
      return {
        Icon: ClipboardCheck,
        wrapperClasses: 'border-yellow-300 bg-yellow-100',
        iconClasses: 'text-yellow-600',
      };
    case '검토 중':
      return {
        Icon: Search,
        wrapperClasses: 'border-blue-300 bg-blue-100',
        iconClasses: 'text-blue-600',
      };
    case '작업 중':
      return {
        Icon: Edit2,
        wrapperClasses: 'border-indigo-300 bg-indigo-100',
        iconClasses: 'text-indigo-600',
      };
    case '교체완료':
    case '교체 완료':
      return {
        Icon: CheckCircle,
        wrapperClasses: 'border-green-300 bg-green-100',
        iconClasses: 'text-green-600',
      };
    case '취소':
      return {
        Icon: XCircle,
        wrapperClasses: 'border-red-300 bg-red-100',
        iconClasses: 'text-red-600',
      };

    // 커스텀 이력 항목
    case '고객정보수정':
      return {
        Icon: User,
        wrapperClasses: 'border-purple-300 bg-purple-100',
        iconClasses: 'text-purple-600',
      };
    case '요청사항 수정':
      return {
        Icon: MessageSquare,
        wrapperClasses: 'border-indigo-300 bg-indigo-100',
        iconClasses: 'text-indigo-600',
      };
    case '스트링 정보 수정':
      return {
        Icon: Edit2,
        wrapperClasses: 'border-blue-300 bg-blue-100',
        iconClasses: 'text-blue-600',
      };
    case '결제 금액 자동 업데이트':
      return {
        Icon: DollarSign,
        wrapperClasses: 'border-green-300 bg-green-100',
        iconClasses: 'text-green-600',
      };

    // default
    default:
      return {
        Icon: Clock,
        wrapperClasses: 'border-gray-300 bg-gray-100',
        iconClasses: 'text-gray-600',
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

  return (
    <Card className="rounded-xl border-gray-200 bg-white shadow-md">
      <CardHeader className="pb-3">
        <CardTitle>신청 처리 이력</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <HistorySkeleton />
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">아직 처리 이력이 없습니다.</div>
        ) : (
          history.map((log, idx) => {
            const { Icon, wrapperClasses, iconClasses } = getIconProps(log.status);
            return (
              <div key={idx} className="flex space-x-4 py-3">
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
                  <p className="mt-1 text-sm text-muted-foreground">{log.description}</p>
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
