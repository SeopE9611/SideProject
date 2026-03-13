const STATUS_LABEL_MAP: Record<string, string> = {
  // order
  pending: '대기중',
  processing: '처리중',
  paid: '결제완료',
  shipped: '배송중',
  delivered: '배송완료',
  confirmed: '구매확정',
  canceled: '취소',
  cancelled: '취소',
  refunded: '환불',
  // rental
  out: '대여중',
  returned: '반납완료',
  // application
  requested: '접수완료',
  received: '접수완료',
  reviewing: '검토 중',
  in_progress: '작업 중',
  completed: '교체완료',
  approved: '승인',
  rejected: '거절',
};

export function getMypageUserStatusLabel(status?: string | null) {
  const raw = String(status ?? '').trim();
  if (!raw) return '상태 미정';

  return STATUS_LABEL_MAP[raw.toLowerCase()] ?? raw;
}

