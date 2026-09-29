import ProductsClient from "@/app/admin/products/ProductsClient";
import React from "react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "상품 관리",
};

export default function ProductsPage() {
  return <ProductsClient />;
}
