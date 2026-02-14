/**
 * Responsibility: mapping only (admin operations 도메인 타입 정의).
 * - API route 로직은 이 파일을 import 해서 도메인 타입을 공유합니다.
 */
export type AdminOperationKind = 'order' | 'stringing_application' | 'rental';
export type AdminOperationFlow = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SettlementAnchor = 'order' | 'rental' | 'application';

export type AdminOperationItem = {
  id: string;
  kind: AdminOperationKind;
  createdAt: string | null;
  customer: { name: string; email: string };
  title: string;
  statusLabel: string;
  paymentLabel?: string;
  amount: number;
  flow: AdminOperationFlow;
  flowLabel: string;
  settlementAnchor: SettlementAnchor;
  settlementLabel: string;
  href: string;
  related?: { kind: AdminOperationKind; id: string; href: string } | null;
  isIntegrated: boolean;
  warnReasons?: string[];
  pendingReasons?: string[];
};
