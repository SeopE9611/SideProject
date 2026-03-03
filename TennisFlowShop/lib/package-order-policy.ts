const TERMINAL_PAYMENT_STATUSES = new Set(['결제취소', '환불']);
const TERMINAL_ORDER_STATUSES = new Set(['취소', '환불']);

export function isTerminalPackageOrderStatus(order: { status?: unknown; paymentStatus?: unknown } | null | undefined): boolean {
  if (!order) return false;

  const paymentStatus = String(order.paymentStatus ?? '').trim();
  if (TERMINAL_PAYMENT_STATUSES.has(paymentStatus)) return true;

  const status = String(order.status ?? '').trim();
  if (TERMINAL_ORDER_STATUSES.has(status)) return true;

  return false;
}
