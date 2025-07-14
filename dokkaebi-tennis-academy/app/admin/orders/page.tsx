import OrdersClient from '@/app/admin/orders/_components/OrdersClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

export default async function OrdersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return <OrdersClient />;
}
