import ShippingFormClient from "@/app/admin/applications/stringing/[id]/shipping-update/ShippingFormClient";
import { isPortfolioDemoReadOnly } from "@/lib/admin/portfolio-demo-readonly.server";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "배송 정보 수정",
};

export default async function ShippingUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isPortfolioDemoReadOnly()) {
    redirect(`/admin/applications/stringing/${id}`);
  }

  return <ShippingFormClient applicationId={id} />;
}
