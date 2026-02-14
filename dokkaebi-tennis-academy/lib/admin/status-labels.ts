export function labelPaymentStatus(raw?: string) {
  const v = String(raw ?? '').trim();
  if (!v) return '결제대기';
  const lower = v.toLowerCase();

  if (v === '결제대기' || v === '대기중' || lower === 'pending' || lower === 'payment_pending' || lower === 'unpaid') return '결제대기';
  if (v === '결제완료' || lower === 'paid' || lower === 'payment_complete' || lower === 'payment_completed') return '결제완료';
  if (v === '취소' || lower === 'canceled' || lower === 'cancelled') return '취소';
  if (v === '환불' || lower === 'refunded' || lower === 'refund') return '환불';
  return v;
}

export function labelOrderStatus(raw?: string) {
  const v = String(raw ?? '').trim();
  if (!v) return '대기중';
  const lower = v.toLowerCase();

  if (['대기중', '배송준비중', '배송중', '배송완료', '취소', '환불'].includes(v)) return v;
  if (lower === 'pending') return '대기중';
  if (lower === 'preparing' || lower === 'processing') return '배송준비중';
  if (lower === 'shipped' || lower === 'in_transit') return '배송중';
  if (lower === 'delivered' || lower === 'completed') return '배송완료';
  if (lower === 'canceled' || lower === 'cancelled') return '취소';
  if (lower === 'refunded') return '환불';
  return v;
}

export function labelStringingStatus(raw?: string) {
  const v = String(raw ?? '').trim();
  if (!v) return '접수완료';
  const lower = v.toLowerCase();

  if (['접수완료', '검토중', '완료', '교체완료', '취소'].includes(v)) return v;
  if (lower === 'pending') return '접수완료';
  if (lower === 'reviewing' || lower === 'in_review' || lower === 'processing') return '검토중';
  if (lower === 'completed') return '완료';
  if (lower === 'canceled' || lower === 'cancelled') return '취소';
  return v;
}
