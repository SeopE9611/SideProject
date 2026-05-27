const isTruthySaleFlag = (value: unknown) =>
  value === true || value === "true" || value === 1;

const toSafePrice = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

export function getEffectiveProductPrice(product: unknown): number {
  const productRecord = asRecord(product);
  const inventory = asRecord(productRecord?.inventory);

  const regularPrice = toSafePrice(productRecord?.price);
  const salePrice = toSafePrice(inventory?.salePrice);

  const isSale =
    isTruthySaleFlag(inventory?.isSale) &&
    salePrice > 0 &&
    salePrice < regularPrice;

  return isSale ? salePrice : regularPrice;
}
