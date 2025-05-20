'use client';

import useSWR from 'swr';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Props = {
  orderId: string;
  initialHistory: any[];
};

export function OrderHistory({ orderId, initialHistory }: Props) {
  console.log('[OrderHistory] SWR key:', `/api/orders/${orderId}/history`);
  const { data: history = [] } = useSWR<any[]>(`/api/orders/${orderId}/history`, fetcher, {
    fallbackData: initialHistory,
    revalidateOnMount: true, //  mount 될 때 강제 fetch
    revalidateOnFocus: false, // 탭 전환 시 re-fetch 방지
    dedupingInterval: 3000, // 동일 요청 최소 간격 3초
  });

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
          {history.map((event, index) => (
            <div key={index} className="flex">
              <div className="mr-4 flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-primary">
                  <Package className="h-5 w-5 text-primary-foreground" />
                </div>
                {index < history.length - 1 && <div className="h-full w-px bg-border" />}
              </div>
              <div className="flex-1 pb-8">
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-semibold">{event.status}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(event.date)}</div>
                </div>
                <p className="mt-1 text-sm">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
