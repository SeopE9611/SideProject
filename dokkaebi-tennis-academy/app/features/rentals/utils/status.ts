// 대여 상태 전이 가드(멱등/일관성 보장용)
// created → paid → out → returned / canceled(종결)
export type RentalStatus = 'created' | 'paid' | 'out' | 'returned' | 'canceled';

// 전이 가능한 상태맵
const FLOW: Record<RentalStatus, RentalStatus[]> = {
  created: ['paid', 'canceled'],
  paid: ['out', 'canceled'],
  out: ['returned'],
  returned: [], // 종결
  canceled: [], // 종결
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
