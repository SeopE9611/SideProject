import ShippingFormClient from "@/app/admin/applications/stringing/[id]/shipping-update/ShippingFormClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배송 정보 수정",
};

export default async function ShippingUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ShippingFormClient applicationId={id} />;
}
