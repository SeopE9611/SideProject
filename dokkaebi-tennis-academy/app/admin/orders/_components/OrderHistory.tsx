'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Truck, CreditCard, RotateCcw, XCircle, Pencil, Clock, PackageCheck } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const LIMIT = 5; // 한 페이지당 처리 이력 개수

type Props = {
  orderId: string;
  initialHistory: any[];
};

export function OrderHistory({ orderId, initialHistory }: Props) {
  const [page, setPage] = useState(1);

  //  SWR로 서버에서 이력 데이터 가져오기
  const { data } = useSWR(() => `/api/orders/${orderId}/history?page=${page}&limit=${LIMIT}`, fetcher, {
    fallbackData: {
      history: initialHistory,
      total: initialHistory.length,
    },
  });

  const history = data?.history || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  //  날짜 포맷 함수
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));

  return (
    <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle>처리 이력</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((event: any, index: number) => {
            let icon = <Package className="h-5 w-5 text-primary-foreground" />;
            let iconWrapperClass = 'bg-primary border-background';
            let textClass = 'text-sm';

            switch (event.status) {
              case '배송중':
                icon = <Truck className="h-5 w-5 text-blue-600" />;
                iconWrapperClass = 'bg-blue-100 border-blue-200';
                break;
              case '배송완료':
                icon = <PackageCheck className="h-5 w-5 text-green-600" />;
                iconWrapperClass = 'bg-green-100 border-green-200';
                break;
              case '결제완료':
                icon = <CreditCard className="h-5 w-5 text-purple-600" />;
                iconWrapperClass = 'bg-purple-100 border-purple-200';
                break;
              case '환불':
                icon = <RotateCcw className="h-5 w-5 text-red-500" />;
                iconWrapperClass = 'bg-red-100 border-red-200';
                textClass = 'text-sm text-red-700 font-semibold';
                break;
              case '취소':
                icon = <XCircle className="h-5 w-5 text-red-500" />;
                iconWrapperClass = 'bg-red-100 border-red-200';
                textClass = 'text-sm text-red-700 font-semibold';
                break;
              case '대기중':
                icon = <Clock className="h-5 w-5 text-gray-500" />;
                iconWrapperClass = 'bg-gray-100 border-gray-200';
                break;
              case '배송정보변경':
                icon = <Pencil className="h-5 w-5 text-blue-500" />;
                iconWrapperClass = 'bg-blue-100 border-blue-200';
                textClass = 'text-sm text-blue-800 font-medium';
                break;
            }

            return (
              <div key={index} className="flex">
                <div className="mr-4 flex flex-col items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-4 ${iconWrapperClass}`}>{icon}</div>
                  {index < history.length - 1 && <div className="h-full w-px bg-border" />}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-baseline justify-between">
                    <div className="text-lg font-semibold">{event.status}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(event.date)}</div>
                  </div>
                  <p className={`mt-1 ${textClass}`}>{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 페이지 버튼 */}
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
