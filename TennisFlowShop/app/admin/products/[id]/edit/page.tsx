import ProductEditClient from "@/app/admin/products/[id]/edit/ProductEditClient";
import React from "react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  return <ProductEditClient productId={id} />;
}
