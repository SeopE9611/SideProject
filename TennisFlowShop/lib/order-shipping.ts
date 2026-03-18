export const ORDER_SHIPPING_METHODS = ["courier", "quick", "visit"] as const;
export type OrderShippingMethod = (typeof ORDER_SHIPPING_METHODS)[number];

/**
 * 주문(Order) 도메인의 shippingMethod를 표준값으로 정규화
 * - 표준: courier | quick | visit
 * - 레거시/혼용: delivery -> courier 로 흡수
 */
export const normalizeOrderShippingMethod = (
  v: any,
): OrderShippingMethod | null => {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;

  // 택배 = courier (레거시 delivery 포함)
  if (
    [
      "courier",
      "delivery",
      "parcel",
      "ship",
      "shipping",
      "택배",
      "택배수령",
      "택배 배송",
      "택배배송",
    ].includes(s)
  )
    return "courier";
  if (["quick", "퀵", "퀵배송"].includes(s)) return "quick";
  if (["visit", "pickup", "방문", "방문수령", "매장"].includes(s))
    return "visit";
  return null;
};

export const orderShippingMethodLabel = (v: any): string => {
  const m = normalizeOrderShippingMethod(v);
  if (m === "courier") return "택배 배송";
  if (m === "quick") return "퀵 배송 (당일)";
  if (m === "visit") return "방문 수령";
  return "정보 없음";
};

export const isVisitPickupOrder = (shippingLike: any): boolean => {
  // 주문 도메인 공통: shippingMethod / deliveryMethod 혼용값 모두 허용
  const rawMethod =
    shippingLike?.shippingMethod ??
    shippingLike?.deliveryMethod ??
    shippingLike;
  return normalizeOrderShippingMethod(rawMethod) === "visit";
};

export const shouldShowDeliveryOnlyFields = (shippingLike: any): boolean => {
  return !isVisitPickupOrder(shippingLike);
};

export const getOrderDeliveryInfoTitle = (shippingLike: any): string => {
  return isVisitPickupOrder(shippingLike) ? "방문 수령 정보" : "배송 정보";
};

export const getOrderStatusLabelForDisplay = (
  status: string,
  shippingLike: any,
): string => {
  if (!isVisitPickupOrder(shippingLike)) return status;
  // 방문 수령 주문은 내부 상태값을 유지하되 화면 문구만 방문 맥락으로 치환
  if (status === "배송중") return "수령 준비중";
  if (status === "배송완료") return "방문 수령 완료";
  return status;
};

export const canConfirmOrderByStatus = (
  status: string,
  shippingLike: any,
): boolean => {
  const normalized = String(status ?? "").trim();
  // 방문 수령 주문은 '완료' 레거시 상태도 구매확정 가능으로 본다.
  if (isVisitPickupOrder(shippingLike)) {
    return (
      normalized === "배송완료" ||
      normalized === "delivered" ||
      normalized === "완료"
    );
  }
  return normalized === "배송완료" || normalized === "delivered";
};
