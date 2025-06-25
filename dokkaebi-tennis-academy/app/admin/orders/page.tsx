import { headers } from 'next/headers';
import { Order } from '@/lib/types/order';
import OrdersClient from '@/app/admin/orders/_components/OrdersClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export default async function OrdersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }
  const headersList = await headers(); // 비동기 함수
  const host = headersList.get('host'); // 현재 요청의 호스트 (예: localhost:3000)
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

  const res = await fetch(`${protocol}://${host}/api/orders`, {
    cache: 'no-store',
    credentials: 'include',
  });

  const orders: Order[] = await res.json();
  return <OrdersClient orders={orders} />; //
}
