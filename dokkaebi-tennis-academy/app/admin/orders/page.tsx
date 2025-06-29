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

  return <OrdersClient />;
}
