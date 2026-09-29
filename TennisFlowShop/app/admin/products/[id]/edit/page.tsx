import ProductEditClient from "@/app/admin/products/[id]/edit/ProductEditClient";
import React from "react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "상품 수정",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  return <ProductEditClient productId={id} />;
}
