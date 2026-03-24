import {
  getCommonApplicationStatusLabel,
  getCommonOrderStatusLabel,
  getCommonPaymentStatusLabel,
  getCommonRentalStatusLabel,
} from "@/lib/status-labels/base";

const MYPAGE_STATUS_LABEL_MAP: Record<string, string> = {
  // order/application 확장
  processing: "처리중",
  reviewing: "검토 중",
  in_progress: "작업 중",
  completed: "교체완료",
};

const MYPAGE_PAYMENT_STATUS_LABEL_MAP: Record<string, string> = {
  refunded: "환불완료",
};

const normalizeStatusInput = (status?: string | null) =>
  String(status ?? "").trim();

export function getMypageUserStatusLabel(status?: string | null) {
  const raw = normalizeStatusInput(status);
  if (!raw) return "상태 미정";

  return (
    getCommonOrderStatusLabel(raw) ??
    getCommonRentalStatusLabel(raw) ??
    getCommonApplicationStatusLabel(raw) ??
    MYPAGE_STATUS_LABEL_MAP[raw.toLowerCase()] ??
    raw
  );
}

export function getMypageNormalizedStatus(status?: string | null) {
  return getMypageUserStatusLabel(status).trim();
}

export function getMypagePaymentStatusLabel(status?: string | null) {
  const raw = normalizeStatusInput(status);
  if (!raw) return "상태 미정";

  return (
    getCommonPaymentStatusLabel(raw) ??
    MYPAGE_PAYMENT_STATUS_LABEL_MAP[raw.toLowerCase()] ??
    raw
  );
}
