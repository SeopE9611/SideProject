type ProductDetailStockLimitErrorParams = {
  quantity: number;
  effectiveStock: number;
  hideGaugeStock: boolean;
};

export function getProductDetailStockLimitErrorMessage({
  quantity,
  effectiveStock,
  hideGaugeStock,
}: ProductDetailStockLimitErrorParams) {
  if (quantity <= effectiveStock) return null;

  return hideGaugeStock
    ? "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다."
    : `재고가 부족합니다. 현재 재고: ${effectiveStock}개`;
}
