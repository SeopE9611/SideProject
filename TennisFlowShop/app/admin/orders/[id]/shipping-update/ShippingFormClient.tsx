"use client";

import ShippingForm from "@/app/admin/orders/[id]/shipping-update/shipping-form";

export interface Props {
  orderId: string;
  initialShippingMethod?: string;
  initialRegisteredShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  initialOrderStatus?: string;
  onSuccess?: () => void;
  isVisitPickupOrder?: boolean;
}
export default function ShippingFormClient({
  orderId,
  initialShippingMethod,
  initialRegisteredShippingMethod,
  initialEstimatedDelivery,
  initialCourier,
  initialTrackingNumber,
  initialOrderStatus,
  onSuccess,
  isVisitPickupOrder,
}: Props) {
  return (
    <ShippingForm
      orderId={orderId}
      initialShippingMethod={initialShippingMethod}
      initialRegisteredShippingMethod={initialRegisteredShippingMethod}
      initialEstimatedDelivery={initialEstimatedDelivery}
      initialCourier={initialCourier}
      initialTrackingNumber={initialTrackingNumber}
      initialOrderStatus={initialOrderStatus}
      onSuccess={onSuccess}
      isVisitPickupOrder={isVisitPickupOrder}
    />
  );
}
