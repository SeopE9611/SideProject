// /**
//  * 정산(매출) 집계 정책
//  *
//  * 핵심:
//  * 1) "통합(연결)" 신청서(orderId/rentalId가 있는 stringing_application)는 운영용 레코드로 보고
//  *    정산(매출)은 주문/대여(결제 앵커)에서 집계한다. => 중복 집계 방지
//  * 2) '결제완료/paid' 상태만 매출로 인정한다.
//  * 3) 스키마 변동 대비: paidAmount가 없으면 totalPrice를 사용한다.
//  */

// const PAID_SET = new Set(['paid', '결제완료', '결제 완료']);

// export function isPaidStatus(v: unknown): boolean {
//   if (!v) return false;
//   const s = String(v).trim();
//   // 영문 상태는 소문자도 허용
//   return PAID_SET.has(s) || PAID_SET.has(s.toLowerCase());
// }

// // ------------------------
// // Orders
// // ------------------------
// export function getOrderPaymentStatus(o: any): unknown {
//   return o?.paymentStatus ?? o?.paymentInfo?.status;
// }

// export function shouldCountOrder(o: any): boolean {
//   return isPaidStatus(getOrderPaymentStatus(o));
// }

// export function getOrderPaidAmount(o: any): number {
//   const n = Number(o?.paidAmount ?? o?.totalPrice ?? 0);
//   return Number.isFinite(n) ? n : 0;
// }

// export function getOrderRefundAmount(o: any): number {
//   const n = Number(o?.refunds ?? 0);
//   return Number.isFinite(n) ? n : 0;
// }

// // ------------------------
// // Stringing Applications
// // ------------------------
// export function shouldCountStringingApplication(a: any): boolean {
//   // draft는 작성중(운영) 상태이므로 정산 제외
//   if (a?.status === 'draft') return false;

//   // 주문/대여에 연결된 신청서는 "결제 앵커"가 주문/대여이므로 정산 제외(중복 집계 방지)
//   if (a?.orderId) return false;
//   if (a?.rentalId) return false;

//   // 레거시 호환: paymentStatus가 없으면 servicePaid=true를 paid로 간주
//   const ps = a?.paymentStatus ?? (a?.servicePaid ? 'paid' : undefined);
//   return isPaidStatus(ps);
// }

// export function getApplicationPaidAmount(a: any): number {
//   const n = Number(a?.totalPrice ?? a?.serviceAmount ?? 0);
//   return Number.isFinite(n) ? n : 0;
// }

// export function getApplicationRefundAmount(a: any): number {
//   const n = Number(a?.refundAmount ?? a?.refunds ?? 0);
//   return Number.isFinite(n) ? n : 0;
// }

// // ------------------------
// // Package Orders
// // ------------------------
// export function shouldCountPackageOrder(p: any): boolean {
//   return isPaidStatus(p?.paymentStatus);
// }

// export function getPackagePaidAmount(p: any): number {
//   const n = Number(p?.totalPrice ?? 0);
//   return Number.isFinite(n) ? n : 0;
// }

// export function getPackageRefundAmount(p: any): number {
//   const n = Number(p?.refundAmount ?? p?.refunds ?? 0);
//   return Number.isFinite(n) ? n : 0;
// }

/**
 * 정산(매출/환불) 집계 정책 공통 모듈
 *
 * 목적:
 * - "무엇을 매출로 볼 것인가?"를 API마다 제각각 구현하지 않고 한 곳에 고정
 * - 연결된 통합건(주문/대여와 연결된 신청서) 중복 집계 방지
 */

// 프로젝트에서 실제로 등장하는 "결제완료" 상태값들을 허용 목록으로 관리
// (필요해지면 여기에만 추가하면 모든 정산 API가 동일하게 따라간다.)

/**
 * "유료(수금 완료)"로 간주하는 결제 상태들
 * - 프로젝트 전반에서 섞여 들어올 수 있는 값을 안전하게 포함
 * - DB는 $in 매칭이 대소문자/문자열 일치 기준이므로, 가능한 값을 넓게.
 */
export const PAID_STATUS_VALUES = ['결제완료', 'paid', 'PAID', 'confirmed', 'CONFIRMED', 'Confirmed'] as const;

export function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function isPaidPaymentStatus(status: unknown): boolean {
  const s = String(status ?? '').trim();
  return (PAID_STATUS_VALUES as readonly string[]).includes(s);
}

/**
 * 주문 매출 금액
 * - paidAmount가 있으면 우선 사용 (실수령/결제확정 금액)
 * - 없으면 totalPrice로 fallback
 */
export function orderPaidAmount(order: any): number {
  const paidAmount = toNumber(order?.paidAmount);
  const totalPrice = toNumber(order?.totalPrice);
  return paidAmount > 0 ? paidAmount : totalPrice;
}

/**
 * 교체서비스 신청서 매출 금액
 * - totalPrice 우선
 * - 일부 구형/특수 케이스에서 totalPrice가 0이면 serviceAmount로 fallback
 */
export function applicationPaidAmount(app: any): number {
  const totalPrice = toNumber(app?.totalPrice);
  const serviceAmount = toNumber(app?.serviceAmount);
  return totalPrice > 0 ? totalPrice : serviceAmount;
}

/**
 * 공통 환불 금액
 * - refunds 필드가 없거나 이상하면 0으로 처리
 */
export function refundsAmount(doc: any): number {
  return toNumber(doc?.refunds);
}

/**
 * "정산에서 신청서를 따로 집계해도 되는가?"
 * - orderId/rentalId가 있으면 주문/대여와 "연결된 통합건"으로 보고 신청서는 정산에서 제외(중복 방지)
 */
export function isStandaloneStringingApplication(app: any): boolean {
  return !app?.orderId && !app?.rentalId;
}
