import { applicationStatusColors, orderStatusColors } from '@/lib/badge-style';

/**
 * 관리자 “운영함(통합)”에서 사용하는 문서 종류(분류) 표준.
 * - 의도: 여러 관리자 화면(주문/대여/운영함)에서 동일한 의미를 동일한 텍스트/색상으로 유지
 * - 주의: 여기서는 “표시(UI)” 규칙만. 정산(금액 산정) 정책은 settlementPolicy가 기준.
 */
export type OpsKind = 'order' | 'stringing_application' | 'rental';

export function opsKindLabel(kind: OpsKind) {
  if (kind === 'order') return '주문';
  if (kind === 'stringing_application') return '신청서';
  return '대여';
}

export function opsKindBadgeClass(kind: OpsKind) {
  if (kind === 'order') return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20';
  if (kind === 'stringing_application') return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20';
  return 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20';
}

/**
 * 대여 상태는 주문/신청서와 별도의 한글 라벨을 쓰므로 여기서 별도 매핑.
 * - OperationsClient는 label(한글)을 기준으로 색상을 매핑.
 */
const rentalStatusColors: Record<string, string> = {
  대기중: 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20',
  결제완료: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20',
  대여중: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20',
  반납완료: 'bg-green-500/10 text-green-600 dark:bg-green-500/20',
  취소됨: 'bg-red-500/10 text-red-600 dark:bg-red-500/20',
};

export function opsStatusBadgeClass(kind: OpsKind, label: string) {
  if (kind === 'order') return orderStatusColors[label] ?? 'bg-gray-500/10 text-gray-600';
  if (kind === 'stringing_application') return (applicationStatusColors as any)[label] ?? applicationStatusColors.default;
  return rentalStatusColors[label] ?? 'bg-gray-500/10 text-gray-600';
}
