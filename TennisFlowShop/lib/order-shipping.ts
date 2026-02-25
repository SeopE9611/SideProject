export const ORDER_SHIPPING_METHODS = ['courier', 'quick', 'visit'] as const;
export type OrderShippingMethod = (typeof ORDER_SHIPPING_METHODS)[number];

/**
 * 주문(Order) 도메인의 shippingMethod를 표준값으로 정규화
 * - 표준: courier | quick | visit
 * - 레거시/혼용: delivery -> courier 로 흡수
 */
export const normalizeOrderShippingMethod = (v: any): OrderShippingMethod | null => {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (!s) return null;

  // 택배 = courier (레거시 delivery 포함)
  if (['courier', 'delivery', 'parcel', 'ship', 'shipping', '택배', '택배수령', '택배 배송', '택배배송'].includes(s)) return 'courier';
  if (['quick', '퀵', '퀵배송'].includes(s)) return 'quick';
  if (['visit', 'pickup', '방문', '방문수령', '매장'].includes(s)) return 'visit';
  return null;
};

export const orderShippingMethodLabel = (v: any): string => {
  const m = normalizeOrderShippingMethod(v);
  if (m === 'courier') return '택배 배송';
  if (m === 'quick') return '퀵 배송 (당일)';
  if (m === 'visit') return '방문 수령';
  return '정보 없음';
};
