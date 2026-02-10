/**
 * 배송비 정책(단일 소스)
 * - 30,000원 이상 무료배송
 * - 미만 3,000원
 * - 방문수령(visit/pickup)은 배송비 0
 */

export const FREE_SHIP_THRESHOLD = 30000;
export const DEFAULT_SHIPPING_FEE = 3000;

export function calcShippingFee(args: {
  subtotal: number;
  isVisitPickup?: boolean; // 방문수령이면 true
}): number {
  const subtotal = Number(args.subtotal || 0);
  const isVisit = Boolean(args.isVisitPickup);

  // subtotal이 0이거나 음수면 배송비는 0 (기존 로직 유지)
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;

  // 방문수령이면 배송비 0
  if (isVisit) return 0;

  // 택배: 30,000원 이상 무료배송, 미만 3,000원
  return subtotal >= FREE_SHIP_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
}
