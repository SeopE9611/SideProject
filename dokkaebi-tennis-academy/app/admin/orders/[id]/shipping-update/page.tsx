import ShippingFormClient from '@/app/admin/orders/[id]/shipping-update/ShippingFormClient';
import { ShippingForm } from '@/app/admin/orders/[id]/shipping-update/shipping-form';
import { headers } from 'next/headers';

export default async function ShippingUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const headersList = await headers();
  const host = headersList.get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;
  const res = await fetch(`${baseUrl}/api/orders/${id}`, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error('주문 데이터를 불러올 수 없습니다.');
  }

  const order = await res.json();

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">배송 정보 관리</h1>
          <p className="mt-2 text-sm text-muted-foreground">주문의 배송 방법과 예상 수령일을 수정할 수 있습니다.</p>
        </div>
        <ShippingFormClient orderId={order._id} initialShippingMethod={order.shippingInfo?.shippingMethod ?? ''} initialEstimatedDelivery={order.shippingInfo?.estimatedDate ?? ''} />
      </div>
    </div>
  );
}
