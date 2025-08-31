import ShippingFormClient from './ShippingFormClient';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import { Truck } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
            <Truck className="h-8 w-8 text-blue-600 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">배송 정보 관리</h1>
          <p className="text-gray-600 dark:text-gray-400">배송 방법과 예상 수령일을 수정할 수 있습니다.</p>
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
