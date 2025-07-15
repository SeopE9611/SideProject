import { headers } from 'next/headers';
import OrderDetailClient from '@/app/features/orders/components/OrderDetailClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  const { id } = await params;
  // 호스트 정보만 서버에서 가져와서 (필요한 경우)
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  return <OrderDetailClient orderId={id} />;
}
