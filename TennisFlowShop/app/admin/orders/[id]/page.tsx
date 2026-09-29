import OrderDetailClient from "@/app/features/orders/components/OrderDetailClient";
import { isPortfolioDemoReadOnly } from "@/lib/admin/portfolio-demo-readonly.server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "주문 상세",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailClient orderId={id} readOnly={isPortfolioDemoReadOnly()} />;
}
