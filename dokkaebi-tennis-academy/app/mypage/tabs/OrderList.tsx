'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { orderStatusColors } from '@/lib/badge-style';

//  주문 데이터 타입 정의
interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: { name: string; quantity: number }[];
  totalPrice: number;
}

//  fetcher 함수 정의 (SWR이 데이터를 불러올 때 사용)
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OrderList() {
  //  SWR을 사용해 API에서 주문 데이터 가져오기
  const { data: orders, error, isLoading } = useSWR<Order[]>('/api/users/me/orders', fetcher);
  console.log(' 주문:', orders);
  //  에러 처리
  if (error) {
    return <div className="text-center py-8 text-red-500">주문 내역을 불러오는 중 오류가 발생했습니다.</div>;
  }

  //  로딩 처리 (부모 Suspense에서 fallback으로도 처리되지만 이중 보호)
  if (isLoading || !orders) {
    return <div className="text-center py-8 text-muted-foreground">주문 내역을 불러오는 중입니다...</div>;
  }

  //  주문이 없을 경우
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">주문 내역이 없습니다.</p>
      </div>
    );
  }

  //  주문 내역 렌더링
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{order.id}</div>
                <div className="text-sm text-muted-foreground">{order.date}</div>
              </div>
              <Badge className={`px-2 py-0.5 text-xs whitespace-nowrap ${orderStatusColors[order.status]}`}>{order.status}</Badge>
            </div>

            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-1">주문 상품</div>
              <ul className="text-sm">
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.name} x {item.quantity}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="font-medium">총 결제 금액: {typeof order.totalPrice === 'number' ? `${order.totalPrice.toLocaleString()}원` : '총 결제 금액 정보 없음'}</div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/mypage/orders/${order.id}`}>상세보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
