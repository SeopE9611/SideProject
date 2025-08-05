import EditProductLoading from '@/app/admin/products/[id]/edit/loading';
import ProductEditClient from '@/app/admin/products/[id]/edit/ProductEditClient';
import React, { Suspense } from 'react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<EditProductLoading />}>
      <ProductEditClient productId={id} />
    </Suspense>
  );
}
