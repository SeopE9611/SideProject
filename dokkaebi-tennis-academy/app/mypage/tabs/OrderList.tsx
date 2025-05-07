'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: { name: string; quantity: number }[];
}

export default function OrderList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">주문 내역이 없습니다.</p>
      </div>
    );
  }

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
              <Badge variant={order.status === '배송 완료' ? 'default' : order.status === '입금 확인' ? 'secondary' : 'outline'}>{order.status}</Badge>
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
              <div className="font-medium">총 결제 금액: {order.total.toLocaleString()}원</div>
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
