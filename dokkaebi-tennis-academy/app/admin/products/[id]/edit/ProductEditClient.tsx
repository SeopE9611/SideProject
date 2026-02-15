'use client';

import ProductEditClientView from './ProductEditClient_view';

/** Responsibility: 상품 수정 화면 진입점(뷰 조합 및 경계 고정). */
export default function ProductEditClient({ productId }: { productId: string }) {
  return <ProductEditClientView productId={productId} />;
}
