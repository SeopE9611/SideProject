import ShippingForm from "./shipping-form";

type RentalShippingUpdatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: RentalShippingUpdatePageProps) {
  const { id } = await params;

  return <ShippingForm rentalId={id} />;
}
