// 대여 상태 전이 가드(멱등/일관성 보장용)
// pending → paid → out → returned / canceled(종결)
export type RentalStatus = 'pending' | 'paid' | 'out' | 'returned' | 'canceled';
export type ShippingStatus = 'none' | 'outbound-set' | 'return-set' | 'both-set';

// 전이 가능한 상태맵
const FLOW: Record<RentalStatus, RentalStatus[]> = {
  pending: ['paid', 'canceled'],
  paid: ['out', 'canceled'],
  out: ['returned'],
  returned: [],
  canceled: [],
};
// 전이 가능 여부 검사
export function canTransit(from: RentalStatus, to: RentalStatus) {
  return FLOW[from]?.includes(to) ?? false;
}

// 멱등 허용(이미 to 상태면 true) 포함 검사
export function canTransitIdempotent(current: RentalStatus, to: RentalStatus) {
  if (current === to) return true; // 같은 요청 반복은 OK(멱등)
  return canTransit(current, to);
}

// 결제 상태 유도: 무통장 예시 기준
export function derivePaymentStatus(rental: any): 'unpaid' | 'paid' {
  // paidAt 또는 관리자가 결제확정한 이벤트 시각 사용
  const paid = Boolean(rental?.payment?.paidAt || rental?.paidAt) || ['paid', 'out', 'returned'].includes(rental?.status);
  return paid ? 'paid' : 'unpaid';
}

// 배송 상태 유도: 운송장 존재 여부
export function deriveShippingStatus(rental: any): ShippingStatus {
  const hasOut = Boolean(rental?.shipping?.outbound?.trackingNumber);
  const hasRet = Boolean(rental?.shipping?.return?.trackingNumber);
  if (hasOut && hasRet) return 'both-set';
  if (hasOut) return 'outbound-set';
  if (hasRet) return 'return-set';
  return 'none';
}
