import ShippingForm from "./shipping-form";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Truck } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배송 정보 수정",
};

type RentalShippingUpdatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: RentalShippingUpdatePageProps) {
  const { id } = await params;

  return (
    <AdminPageShell variant="narrow">
      <AdminPageHeader title="대여 배송 정보 관리" description="대여 상품의 수령 방식과 인도 운송장 정보를 관리합니다." icon={Truck} />
      <ShippingForm rentalId={id} />
    </AdminPageShell>
  );
}
