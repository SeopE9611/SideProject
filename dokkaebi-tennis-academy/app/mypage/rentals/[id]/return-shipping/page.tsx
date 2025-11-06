import ReturnShippingForm from '@/app/mypage/rentals/[id]/return-shipping/return-form';

export default function Page({ params }: { params: { id: string } }) {
  return <ReturnShippingForm rentalId={params.id} />;
}
