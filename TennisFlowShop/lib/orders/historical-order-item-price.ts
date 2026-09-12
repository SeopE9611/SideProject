export type HistoricalOrderItemPriceInput = {
  price?: unknown;
  regularPrice?: unknown;
  salePrice?: unknown;
  discountRate?: unknown;
};

export type HistoricalOrderItemPriceDisplay = {
  displayPrice: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  discountAmount: number | null;
  discountRate: number | null;
  snapshotStatus: "confirmed" | "needs_review";
};

export type HistoricalStringingItemPriceInput = {
  mountingFee?: unknown;
  price?: unknown;
  isExplicitFree?: boolean;
};

function toFiniteNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function resolveHistoricalOrderItemPrice(
  item: HistoricalOrderItemPriceInput,
): HistoricalOrderItemPriceDisplay {
  const snapshotPrice = toFiniteNonNegativeNumber(item.price);
  const snapshotSalePrice = toFiniteNonNegativeNumber(item.salePrice);
  const snapshotRegularPrice = toFiniteNonNegativeNumber(item.regularPrice);
  const snapshotDiscountRate = toFiniteNonNegativeNumber(item.discountRate);

  const isExplicitFreeSnapshot =
    snapshotPrice === 0 && (snapshotSalePrice === 0 || snapshotDiscountRate === 100);
  const hasConfirmedSnapshot =
    snapshotPrice !== null && (snapshotPrice > 0 || isExplicitFreeSnapshot);

  if (!hasConfirmedSnapshot) {
    return {
      displayPrice: null,
      regularPrice: null,
      salePrice: null,
      discountAmount: null,
      discountRate: null,
      snapshotStatus: "needs_review",
    };
  }

  const displayPrice = snapshotPrice;
  const regularPrice =
    snapshotRegularPrice !== null && snapshotRegularPrice > displayPrice
      ? snapshotRegularPrice
      : null;
  const hasDiscount = regularPrice !== null;

  return {
    displayPrice,
    regularPrice,
    salePrice: hasDiscount ? displayPrice : null,
    discountAmount: hasDiscount ? regularPrice - displayPrice : null,
    discountRate: hasDiscount
      ? Math.round(((regularPrice - displayPrice) / regularPrice) * 100)
      : null,
    snapshotStatus: "confirmed",
  };
}

/**
 * 교체서비스 상품 가격은 신청서에 저장된 장착비 스냅샷만 과거 가격으로 인정한다.
 * 현재 catalog 가격은 과거 결제 가격의 증거가 아니므로 이 helper의 입력으로 받지 않는다.
 */
export function resolveHistoricalStringingItemPrice(
  item: HistoricalStringingItemPriceInput,
): Pick<HistoricalOrderItemPriceDisplay, "displayPrice" | "snapshotStatus"> {
  const snapshot =
    toFiniteNonNegativeNumber(item.mountingFee) ?? toFiniteNonNegativeNumber(item.price);
  const resolved = resolveHistoricalOrderItemPrice({
    price: snapshot,
    salePrice: item.isExplicitFree && snapshot === 0 ? 0 : undefined,
  });
  return {
    displayPrice: resolved.displayPrice,
    snapshotStatus: resolved.snapshotStatus,
  };
}
