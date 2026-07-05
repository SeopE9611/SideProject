export const USER_CANCEL_ALLOWED_STATUSES = ["대기중", "결제완료"] as const;
export const ADMIN_SIMPLE_CANCEL_ALLOWED_STATUSES = ["대기중", "결제완료"] as const;
export const ADMIN_FORCE_CANCEL_BLOCKED_STATUSES = [
  "취소",
  "취소완료",
  "취소승인",
  "결제취소",
  "환불",
  "환불완료",
] as const;

export function isUserCancelableOrderStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return USER_CANCEL_ALLOWED_STATUSES.includes(
    status as (typeof USER_CANCEL_ALLOWED_STATUSES)[number],
  );
}

export function isAdminSimpleCancelableOrderStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ADMIN_SIMPLE_CANCEL_ALLOWED_STATUSES.includes(
    status as (typeof ADMIN_SIMPLE_CANCEL_ALLOWED_STATUSES)[number],
  );
}

export function isAdminForceCancelableOrderStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return !ADMIN_FORCE_CANCEL_BLOCKED_STATUSES.includes(
    status as (typeof ADMIN_FORCE_CANCEL_BLOCKED_STATUSES)[number],
  );
}

export function isAdminForceCancelRequired(
  status: string | null | undefined,
  hasTrackingNumber = false,
): boolean {
  return (
    isAdminForceCancelableOrderStatus(status) &&
    (!isAdminSimpleCancelableOrderStatus(status) || hasTrackingNumber)
  );
}

export function isAdminCancelableOrderStatus(status: string | null | undefined): boolean {
  return isAdminForceCancelableOrderStatus(status);
}

export function getAdminCancelPolicyMessage(
  status: string | null | undefined,
  hasTrackingNumber = false,
): string {
  if (!isAdminForceCancelableOrderStatus(status)) {
    return "이미 취소/환불 처리된 주문은 중복 취소할 수 없습니다.";
  }

  if (isAdminForceCancelRequired(status, hasTrackingNumber)) {
    return "일반 사용자 취소가 불가능한 상태이므로 관리자 강제 취소 확인이 필요합니다.";
  }

  return "배송 전 단계이므로 주문 취소로 처리할 수 있습니다.";
}
