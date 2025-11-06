import { Suspense } from 'react';
import ShippingForm from './shipping-form';

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="p-6">불러오는 중…</div>}>
      <ShippingForm rentalId={params.id} />
    </Suspense>
  );
}
