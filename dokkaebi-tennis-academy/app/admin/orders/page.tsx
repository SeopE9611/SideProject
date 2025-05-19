import { headers } from 'next/headers';
import { Order } from '@/lib/types/order';
import OrdersClient from './_components/OrdersClient';

export default async function OrdersPage() {
  const headersList = await headers(); // 비동기 함수
  const host = headersList.get('host'); // 현재 요청의 호스트 (예: localhost:3000)
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

  const res = await fetch(`${protocol}://${host}/api/orders`, {
    cache: 'no-store',
  });

  const orders: Order[] = await res.json();
  return <OrdersClient orders={orders} />;
}
