/**
 * 배송비 정책(단일 소스)
 * - 기본 배송비: 3,000원
 * - 방문수령(visit/pickup)은 배송비 0
 * - 주문 배송비: 아이템별 shippingFee의 최댓값(max)
 */

export const FREE_SHIP_THRESHOLD = 30000;
export const DEFAULT_SHIPPING_FEE = 3000;

export function normalizeItemShippingFee(raw: unknown): number {
  const fee = Number(raw);
  if (!Number.isFinite(fee)) return DEFAULT_SHIPPING_FEE;
  if (fee < 0) return DEFAULT_SHIPPING_FEE;
  return fee;
}

export function calcOrderShippingFeeFromItems(args: {
  items: Array<{ shippingFee?: unknown }>;
  isVisitPickup?: boolean;
}): number {
  if (args.isVisitPickup) return 0;

  const items = Array.isArray(args.items) ? args.items : [];
  if (items.length === 0) return 0;

  return items.reduce((maxFee, item) => {
    const normalized = normalizeItemShippingFee(item?.shippingFee);
    return Math.max(maxFee, normalized);
  }, 0);
}

/**
 * @deprecated subtotal 기반 정책(3만원 이상 무료배송)은 더 이상 사용하지 마세요.
 */
export function calcShippingFee(args: {
  subtotal: number;
  isVisitPickup?: boolean;
}): number {
  const subtotal = Number(args.subtotal || 0);
  const isVisit = Boolean(args.isVisitPickup);

  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (isVisit) return 0;

  return subtotal >= FREE_SHIP_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
}
