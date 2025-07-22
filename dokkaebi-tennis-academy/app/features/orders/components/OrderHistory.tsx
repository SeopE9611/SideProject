'use client';
import React, { useState, useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Truck, CreditCard, RotateCcw, XCircle, Pencil, Clock, PackageCheck } from 'lucide-react';

export const getOrderHistoryKey = (orderId?: string) => (pageIndex: number, previousPageData: any) => {
  // orderId가 없으면 요청 중단
  if (!orderId) return null;
  if (previousPageData && !previousPageData.length) return null;
  return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=5`;
};
// 상태별로 아이콘 컴포넌트와 클래스 리턴하는 헬퍼 함수
function getIconProps(status: string) {
  switch (status) {
    case '대기중':
      return {
        Icon: Clock,
        wrapperClasses: 'border-gray-300 bg-gray-100',
        iconClasses: 'text-gray-600',
      };
    case '결제완료':
      return {
        Icon: CreditCard,
        wrapperClasses: 'border-purple-300 bg-purple-100',
        iconClasses: 'text-purple-600',
      };
    case '배송중':
      return {
        Icon: Truck,
        wrapperClasses: 'border-blue-300 bg-blue-100',
        iconClasses: 'text-blue-600',
      };
    case '배송완료':
      return {
        Icon: PackageCheck,
        wrapperClasses: 'border-green-300 bg-green-100',
        iconClasses: 'text-green-600',
      };
    case '환불':
      return {
        Icon: RotateCcw,
        wrapperClasses: 'border-red-300 bg-red-100',
        iconClasses: 'text-red-600',
      };
    case '취소':
      return {
        Icon: XCircle,
        wrapperClasses: 'border-red-300 bg-red-100',
        iconClasses: 'text-red-600',
      };
    case '배송정보변경':
      return {
        Icon: Pencil,
        wrapperClasses: 'border-yellow-300 bg-yellow-100',
        iconClasses: 'text-yellow-600',
      };
    default:
      return {
        Icon: Package,
        wrapperClasses: 'border-primary bg-primary/10',
        iconClasses: 'text-primary-600',
      };
  }
}

const LIMIT = 5;
const fetcher = (u: string) => fetch(u, { credentials: 'include' }).then((r) => r.json());

interface HistoryItem {
  status: string;
  date: string;
  description: string;
}
interface HistoryResponse {
  history: HistoryItem[];
  total: number;
}

export default function OrderHistory({ orderId }: { orderId: string }) {
  const [page, setPage] = useState(1);

  // getKey: pageIndex마다 서버에 page=pageIndex+1 요청
  const getKey = (orderId: string) => (pageIndex: number, prev: HistoryResponse | null) => {
    if (prev && prev.history.length === 0) return null; // 더 이상 페이지 없으면 중단
    return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
  };
  // useSWRInfinite 훅: pages[0]은 page=1 응답, pages[1]은 page=2 응답...
  const {
    data: pages,
    size,
    setSize,
    isValidating,
    mutate: mutateHistory,
  } = useSWRInfinite<HistoryResponse>(getKey(orderId), fetcher, {
    revalidateOnFocus: false, // 탭 포커스 돌아올 때 재요청 금지
    revalidateOnReconnect: false, // 네트워크 복구 시 재요청 금지
    // refreshInterval: 0
  });

  // 선택된 페이지가 아직 로드되지 않았다면 로드
  useEffect(() => {
    if (page > size) setSize(page);
  }, [page, size, setSize]);

  //상태 변경 후 'order-history-page-reset' 이벤트를 받으면  page를 1로 리셋하도록
  useEffect(() => {
    const reset = () => setPage(1);
    window.addEventListener('order-history-page-reset', reset);
    return () => {
      window.removeEventListener('order-history-page-reset', reset);
    };
  }, []);

  // “지금 보여줄” 현재 페이지 데이터
  const pageData = pages?.[page - 1] ?? { history: [], total: 0 };

  // 내림차순 정렬 (최신 먼저)
  const pageItems = [...pageData.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.max(1, Math.ceil(pageData.total / LIMIT));

  return (
    <Card className="md:col-span-3 rounded-xl border-gray-200 bg-white shadow-md">
      <CardHeader className="pb-3">
        <CardTitle>처리 이력</CardTitle>
        <p className="text-sm text-muted-foreground">최신 변경이 맨 위에 표시됩니다.</p>
      </CardHeader>
      <CardContent>
        {/* 로딩 중일 때 스켈레톤 5줄 */}
        {pages === undefined ? (
          Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="flex animate-pulse space-x-4 py-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))
        ) : /* 빈 상태일 때 메시지 */
        pageData.history.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">아직 처리 이력이 없습니다.</div>
        ) : (
          /* 실제 데이터 렌더 */
          pageItems.map((item, idx) => {
            const { Icon, wrapperClasses, iconClasses } = getIconProps(item.status);
            return (
              <div key={idx} className="flex space-x-4 py-3">
                <div className={`h-10 w-10 flex items-center justify-center rounded-full border ${wrapperClasses}`}>
                  <Icon className={`h-6 w-6 ${iconClasses}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-semibold">{item.status}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(item.date))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })
        )}

        {/* 4) 페이지네이션 */}
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
