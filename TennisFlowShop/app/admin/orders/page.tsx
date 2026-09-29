import OrdersClient from "@/app/features/orders/components/OrdersClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "주문 관리",
};

export default async function OrdersPage() {
  return <OrdersClient />;
}
