import { Card, CardTitle } from '@/components/ui/card';
import ShippingFormClient from './ShippingFormClient';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

export default async function ShippingUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  const headersList = await headers();
  const host = headersList.get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;
  const cookie = headersList.get('cookie') ?? '';

  const res = await fetch(`${baseUrl}/api/orders/${id}`, {
    cache: 'no-store',
    headers: { cookie },
  });

  if (!res.ok) throw new Error('주문 데이터를 불러올 수 없습니다.');

  const order = await res.json();

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">배송 정보 관리</h1>
          <p className="mt-2 text-sm text-muted-foreground">배송 방법과 예상 수령일을 수정할 수 있습니다.</p>
        </div>
        <ShippingFormClient
          orderId={order._id}
          initialShippingMethod={order.shippingInfo?.shippingMethod ?? ''}
          initialEstimatedDelivery={order.shippingInfo?.estimatedDate ?? ''}
          initialCourier={order.shippingInfo?.invoice?.courier ?? ''}
          initialTrackingNumber={order.shippingInfo?.invoice?.trackingNumber ?? ''}
        />
      </div>
    </div>
  );
}
