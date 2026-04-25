import ShippingForm from "./shipping-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배송 정보 수정",
};

type RentalShippingUpdatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: RentalShippingUpdatePageProps) {
  const { id } = await params;

  return <ShippingForm rentalId={id} />;
}
