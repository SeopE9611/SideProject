export const ADMIN_CANCEL_ALLOWED_STATUSES = ['대기중', '결제완료'] as const;

export function isAdminCancelableOrderStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ADMIN_CANCEL_ALLOWED_STATUSES.includes(status as (typeof ADMIN_CANCEL_ALLOWED_STATUSES)[number]);
}

export function getAdminCancelPolicyMessage(status: string | null | undefined): string {
  if (isAdminCancelableOrderStatus(status)) {
    return '배송 전 단계이므로 주문 취소로 처리할 수 있습니다.';
  }

  return '배송이 시작된 주문은 취소가 아닌 환불로 처리하세요.';
}

