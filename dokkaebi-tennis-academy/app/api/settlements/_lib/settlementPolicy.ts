/**
 * 정산(매출) 집계 정책
 *
 * 핵심:
 * 1) "통합(연결)" 신청서(orderId/rentalId가 있는 stringing_application)는 운영용 레코드로 보고
 *    정산(매출)은 주문/대여(결제 앵커)에서 집계한다. => 중복 집계 방지
 * 2) '결제완료/paid' 상태만 매출로 인정한다.
 * 3) 스키마 변동 대비: paidAmount가 없으면 totalPrice를 사용한다.
 */

const PAID_SET = new Set(['paid', '결제완료', '결제 완료']);

export function isPaidStatus(v: unknown): boolean {
  if (!v) return false;
  const s = String(v).trim();
  // 영문 상태는 소문자도 허용
  return PAID_SET.has(s) || PAID_SET.has(s.toLowerCase());
}

// ------------------------
// Orders
// ------------------------
export function getOrderPaymentStatus(o: any): unknown {
  return o?.paymentStatus ?? o?.paymentInfo?.status;
}

export function shouldCountOrder(o: any): boolean {
  return isPaidStatus(getOrderPaymentStatus(o));
}

export function getOrderPaidAmount(o: any): number {
  const n = Number(o?.paidAmount ?? o?.totalPrice ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function getOrderRefundAmount(o: any): number {
  const n = Number(o?.refunds ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// ------------------------
// Stringing Applications
// ------------------------
export function shouldCountStringingApplication(a: any): boolean {
  // draft는 작성중(운영) 상태이므로 정산 제외
  if (a?.status === 'draft') return false;

  // 주문/대여에 연결된 신청서는 "결제 앵커"가 주문/대여이므로 정산 제외(중복 집계 방지)
  if (a?.orderId) return false;
  if (a?.rentalId) return false;

  // 레거시 호환: paymentStatus가 없으면 servicePaid=true를 paid로 간주
  const ps = a?.paymentStatus ?? (a?.servicePaid ? 'paid' : undefined);
  return isPaidStatus(ps);
}

export function getApplicationPaidAmount(a: any): number {
  const n = Number(a?.totalPrice ?? a?.serviceAmount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function getApplicationRefundAmount(a: any): number {
  const n = Number(a?.refundAmount ?? a?.refunds ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// ------------------------
// Package Orders
// ------------------------
export function shouldCountPackageOrder(p: any): boolean {
  return isPaidStatus(p?.paymentStatus);
}

export function getPackagePaidAmount(p: any): number {
  const n = Number(p?.totalPrice ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function getPackageRefundAmount(p: any): number {
  const n = Number(p?.refundAmount ?? p?.refunds ?? 0);
  return Number.isFinite(n) ? n : 0;
}