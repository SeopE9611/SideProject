import {
  getCommonApplicationStatusLabel,
  getCommonOrderStatusLabel,
  getCommonPaymentStatusLabel,
  getCommonRentalStatusLabel,
} from "@/lib/status-labels/base";

/**
 * Status Labels Layer 2 (mypage wrapper/adaptor):
 * - base 공용 매핑을 재사용하면서, 마이페이지 UI fallback/호환 라벨을 보강합니다.
 * - 혼합 피드/복합 화면의 안정성을 위해 wrapper를 유지합니다.
 * - 방문 수령 문구 치환은 여기서 하지 않고 호출부에서 order-shipping 후처리로 분리합니다.
 */
const MYPAGE_STATUS_LABEL_MAP: Record<string, string> = {
  // order/application 확장
  canceled: "취소",
  cancelled: "취소",
  cancel_requested: "취소 요청",
  cancel_request: "취소 요청",
  refunding: "환불 처리중",
  refunded: "환불",
  processing: "처리중",
  preparing: "처리중",
  shipped: "배송중",
  delivered: "배송완료",
  confirmed: "구매확정",
  pending: "대기중",
  paid: "결제완료",
  returned: "반납완료",
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
