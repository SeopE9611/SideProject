'use client';

import { ShippingForm } from '@/components/shipping-form';

interface Props {
  orderId: string;
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
}

export default function ShippingFormClient({ orderId, initialShippingMethod, initialEstimatedDelivery }: Props) {
  return <ShippingForm orderId={orderId} initialShippingMethod={initialShippingMethod} initialEstimatedDelivery={initialEstimatedDelivery} />;
}
