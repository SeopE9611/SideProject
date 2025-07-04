'use client';

import ShippingForm from '@/app/admin/applications/stringing/[id]/shipping-update/shipping-form';

export interface Props {
  applicationId: string;
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  onSuccess?: () => void;
}

export default function ShippingFormClient({ applicationId, initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber, onSuccess }: Props) {
  return (
    <ShippingForm applicationId={applicationId} initialShippingMethod={initialShippingMethod} initialEstimatedDelivery={initialEstimatedDelivery} initialCourier={initialCourier} initialTrackingNumber={initialTrackingNumber} onSuccess={onSuccess} />
  );
}
