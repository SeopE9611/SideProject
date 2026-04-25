import NewStringPage from "@/app/admin/products/new/ProductNewClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "상품 등록",
};

export default async function ProductNewPage() {
  return <NewStringPage />;
}
