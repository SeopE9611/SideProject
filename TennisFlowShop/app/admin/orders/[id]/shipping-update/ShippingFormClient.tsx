'use client';

import ShippingForm from '@/app/admin/orders/[id]/shipping-update/shipping-form';

export interface Props {
  orderId: string;
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  onSuccess?: () => void;
}
export default function ShippingFormClient({ orderId, initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber, onSuccess }: Props) {
  return <ShippingForm orderId={orderId} initialShippingMethod={initialShippingMethod} initialEstimatedDelivery={initialEstimatedDelivery} initialCourier={initialCourier} initialTrackingNumber={initialTrackingNumber} onSuccess={onSuccess} />;
}
