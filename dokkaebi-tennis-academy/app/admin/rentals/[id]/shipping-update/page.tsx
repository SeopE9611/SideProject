import { Suspense } from 'react';
import ShippingForm from './shipping-form';

type RentalShippingUpdatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: RentalShippingUpdatePageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="p-6">불러오는 중…</div>}>
      <ShippingForm rentalId={id} />
    </Suspense>
  );
}
