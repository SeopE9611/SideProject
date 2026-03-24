/**
 * Status Labels Layer 1 (base):
 * - 공용 raw status -> 한글 기본 라벨 매핑만 담당합니다.
 * - 화면/도메인별 fallback 정책(예: "상태 미정")은 wrapper에서 처리합니다.
 * - 방문 수령 문구 치환(예: 배송중 -> 수령 준비중)은 이 레이어에서 처리하지 않습니다.
 *   (후처리: lib/order-shipping.ts)
 */
const normalizeStatusInput = (raw?: string | null) => String(raw ?? "").trim();

const getMappedLabel = (
  raw: string,
  map: Record<string, string>,
): string | null => {
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  return map[lowered] ?? null;
};

const ORDER_STATUS_LABEL_MAP: Record<string, string> = {
  pending: "대기중",
  shipped: "배송중",
  delivered: "배송완료",
  confirmed: "구매확정",
  canceled: "취소",
  cancelled: "취소",
  refunded: "환불",
  paid: "결제완료",
};

const PAYMENT_STATUS_LABEL_MAP: Record<string, string> = {
  paid: "결제완료",
  pending: "결제대기",
  failed: "결제실패",
  canceled: "결제취소",
  cancelled: "결제취소",
  refunded: "환불완료",
};

const APPLICATION_STATUS_LABEL_MAP: Record<string, string> = {
  requested: "접수완료",
  received: "접수완료",
  approved: "승인",
  rejected: "거절",
};

const RENTAL_STATUS_LABEL_MAP: Record<string, string> = {
  out: "대여중",
  returned: "반납완료",
};

export function getCommonOrderStatusLabel(raw?: string | null): string | null {
  return getMappedLabel(normalizeStatusInput(raw), ORDER_STATUS_LABEL_MAP);
}

export function getCommonPaymentStatusLabel(raw?: string | null): string | null {
  return getMappedLabel(normalizeStatusInput(raw), PAYMENT_STATUS_LABEL_MAP);
}

export function getCommonApplicationStatusLabel(
  raw?: string | null,
): string | null {
  return getMappedLabel(normalizeStatusInput(raw), APPLICATION_STATUS_LABEL_MAP);
}

export function getCommonRentalStatusLabel(raw?: string | null): string | null {
  return getMappedLabel(normalizeStatusInput(raw), RENTAL_STATUS_LABEL_MAP);
}
