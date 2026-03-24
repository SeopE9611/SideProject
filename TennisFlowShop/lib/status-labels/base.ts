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
