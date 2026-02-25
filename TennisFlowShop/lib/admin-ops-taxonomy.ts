/**
 * 관리자 “운영함(통합)”에서 사용하는 문서 종류(분류) 표준.
 * - 의도: 여러 관리자 화면(주문/대여/운영함)에서 동일한 의미를 동일한 텍스트/색상으로 유지
 * - 주의: 여기서는 “표시(UI)” 규칙만. 정산(금액 산정) 정책은 settlementPolicy가 기준.
 */
export type OpsKind = 'order' | 'stringing_application' | 'rental';
export type OpsBadgeTone = 'success' | 'warning' | 'destructive' | 'muted' | 'info';
export type OpsSignalType = 'status' | 'payment';

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

const SIGNAL_PRIORITY: Record<OpsBadgeTone, number> = {
  destructive: 5,
  warning: 4,
  info: 3,
  success: 2,
  muted: 1,
};

/**
 * 상태/결제 라벨이 같은 의미로 중복 노출되는 것을 막기 위한 우선 신호 선택기.
 * - 톤 매핑은 입력받은 값을 그대로 사용한다.
 * - 우선순위는 위험도(파괴적 > 경고 > 정보 > 성공 > 중립) + 같은 톤이면 결제를 우선한다.
 */
export function pickPrimaryOpsSignal(
  signals: Array<{ label?: string | null; tone: OpsBadgeTone; type: OpsSignalType }>,
) {
  const filtered = signals.filter((signal) => signal.label && signal.label.trim().length > 0);
  if (filtered.length === 0) return null;

  const deduped = filtered.filter((signal, idx, arr) => arr.findIndex((x) => x.label === signal.label && x.tone === signal.tone) === idx);
  deduped.sort((a, b) => {
    const toneDiff = SIGNAL_PRIORITY[b.tone] - SIGNAL_PRIORITY[a.tone];
    if (toneDiff !== 0) return toneDiff;
    if (a.type === b.type) return 0;
    return a.type === 'payment' ? -1 : 1;
  });

  return deduped[0] ?? null;
}
