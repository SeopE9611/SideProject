/**
 * 관리자 “운영함(통합)”에서 사용하는 문서 종류(분류) 표준.
 * - 의도: 여러 관리자 화면(주문/대여/운영함)에서 동일한 의미를 동일한 텍스트/색상으로 유지
 * - 주의: 여기서는 “표시(UI)” 규칙만. 정산(금액 산정) 정책은 settlementPolicy가 기준.
 */
export type OpsKind = 'order' | 'stringing_application' | 'rental';
export type OpsBadgeTone = 'success' | 'warning' | 'destructive' | 'muted' | 'info';

export function opsKindLabel(kind: OpsKind) {
  if (kind === 'order') return '주문';
  if (kind === 'stringing_application') return '신청서';
  return '대여';
}

const opsKindColors: Record<OpsKind, OpsBadgeTone> = {
  order: 'info',
  stringing_application: 'warning',
  rental: 'success',
};

export function opsKindBadgeTone(kind: OpsKind): OpsBadgeTone {
  return opsKindColors[kind] ?? 'muted';
}

const orderStatusColors: Record<string, OpsBadgeTone> = {
  대기중: 'warning',
  처리중: 'info',
  결제완료: 'success',
  배송중: 'info',
  배송완료: 'success',
  구매확정: 'success',
  취소: 'destructive',
  환불: 'destructive',
};

const applicationStatusColors: Record<string, OpsBadgeTone> = {
  접수완료: 'success',
  '검토 중': 'warning',
  '작업 중': 'info',
  교체완료: 'success',
  취소: 'destructive',
};

/**
 * 대여 상태는 주문/신청서와 별도의 한글 라벨을 쓰므로 여기서 별도 매핑.
 * - OperationsClient는 label(한글)을 기준으로 색상을 매핑.
 */
const rentalStatusColors: Record<string, OpsBadgeTone> = {
  대기중: 'warning',
  결제완료: 'info',
  대여중: 'warning',
  반납완료: 'success',
  취소됨: 'destructive',
};

export function opsStatusBadgeTone(kind: OpsKind, label: string): OpsBadgeTone {
  if (kind === 'order') return orderStatusColors[label] ?? 'muted';
  if (kind === 'stringing_application') return applicationStatusColors[label] ?? 'muted';
  return rentalStatusColors[label] ?? 'muted';
}
