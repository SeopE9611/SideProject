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
export const PAID_STATUS_VALUES = ['결제완료', '결제 완료', 'paid', 'PAID', 'confirmed', 'CONFIRMED', 'Confirmed'] as const;

export function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function isPaidPaymentStatus(status: unknown): boolean {
  const raw = String(status ?? '').trim();
  const key = raw.replace(/\s+/g, '').toLowerCase();
  return key === '결제완료' || key === 'paid' || key === 'confirmed';
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

/**
 * 정산 누락 방지용 "유료(수금 완료)" 매칭 쿼리
 * - 결제상태가 paymentStatus / paymentInfo.status 등으로 혼재될 수 있어 OR로 커버
 * - '결제 완료'(공백) / paid / confirmed 대소문자 흔들림은 regex로 보강
 */
export function buildPaidMatch(fields: string[] = ['paymentStatus', 'paymentInfo.status']) {
  const ors: any[] = [];
  for (const f of fields) {
    ors.push({ [f]: { $in: PAID_STATUS_VALUES } });
    ors.push({ [f]: { $regex: /^결제\s*완료$/ } });
    ors.push({ [f]: { $regex: /^paid$/i } });
    ors.push({ [f]: { $regex: /^confirmed$/i } });
  }
  return { $or: ors };
}

/**
 * rental_orders(라켓 대여 결제) 정산 정책
 * - 매출: (최종 결제액 - 보증금)
 *   - amount.total: 포인트 차감까지 반영된 "최종 결제액" (deposit 포함)
 *   - amount.deposit: 보증금(추후 반환) → 매출/순익에서 제외하고 별도 합산
 * - 목적: 대여 통합(스트링 가격/교체비 포함) 케이스에서 누락 없이 매출 집계 + 보증금 분리
 */
export const RENTAL_PAID_STATUS_VALUES = ['paid', 'out', 'returned'] as const;

export function buildRentalPaidMatch() {
  return {
    /**
     * 주의:
     * - 일부 흐름에서 status가 'canceled'로 바뀌더라도 paidAt이 남아있을 수 있음
     * - paidAt만으로 포함시키는 OR 조건 때문에 취소건이 정산에 섞이지 않도록 명시적으로 제외
     */
    $and: [{ status: { $ne: 'canceled' } }, { $or: [{ status: { $in: RENTAL_PAID_STATUS_VALUES as any } }, { paidAt: { $type: 'date' } }, { 'payment.paidAt': { $type: 'date' } }] }],
  };
}

export function rentalPaidAmount(rental: any) {
  /**
   * 정책(안전 버전):
   * - "대여 매출"은 최종 결제액(amount.total)에서 보증금(amount.deposit)을 뺀 값
   * - 이유:
   *   1) 대여 통합(스트링 가격/교체비 포함)에서 fee만 쓰면 매출 누락 가능
   *   2) amount.total은 포인트 차감까지 반영된 값이라 정산 기준으로 가장 안전
   */
  const total = toNumber(rental?.amount?.total ?? rental?.paidAmount ?? rental?.totalPrice ?? rental?.total);
  const deposit = toNumber(rental?.amount?.deposit ?? rental?.deposit ?? rental?.depositAmount);
  if (total > 0) {
    return Math.max(0, total - deposit);
  }

  // 레거시/예외 fallback: total이 비어있다면 (fee + stringPrice + stringingFee) 기반으로 계산(보증금 제외)
  const fee = toNumber(rental?.amount?.fee ?? rental?.fee ?? rental?.rentalFee);
  const stringPrice = toNumber(rental?.amount?.stringPrice ?? rental?.stringPrice);
  const stringingFee = toNumber(rental?.amount?.stringingFee ?? rental?.stringingFee ?? rental?.serviceFeeHint);
  return Math.max(0, fee + stringPrice + stringingFee);
}

export function rentalDepositAmount(rental: any) {
  const deposit = rental?.amount?.deposit ?? rental?.deposit ?? rental?.depositAmount ?? 0;
  return toNumber(deposit);
}
