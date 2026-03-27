/**
 * Responsibility: mapping only (admin operations 도메인 타입 정의).
 * - API route 로직은 이 파일을 import 해서 도메인 타입을 공유합니다.
 */
export type AdminOperationKind = "order" | "stringing_application" | "rental";
export type AdminOperationFlow = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SettlementAnchor = "order" | "rental" | "application";
export type AdminOperationReviewLevel = "none" | "info" | "action";
export type AdminOperationCancelStatus =
  | "none"
  | "requested"
  | "approved"
  | "rejected";

export type OperationSignalLevel = "warn" | "review" | "pending" | "info";

export type OperationSignal = {
  code: string;
  level: OperationSignalLevel;
  sourceKind: AdminOperationKind;
  sourceId: string;
  title: string;
  description: string;
  nextAction?: string;
};

export type AdminOperationItem = {
  id: string;
  kind: AdminOperationKind;
  createdAt: string | null;
  customer: { name: string; email: string };
  title: string;
  statusLabel: string;
  statusDisplayLabel?: string;
  paymentLabel?: string;
  amount: number;
  amountNote?: string;
  amountReference?: number;
  amountReferenceLabel?: string;
  flow: AdminOperationFlow;
  flowLabel: string;
  settlementAnchor: SettlementAnchor;
  settlementLabel: string;
  href: string;
  related?: { kind: AdminOperationKind; id: string; href: string } | null;
  isIntegrated: boolean;
  warnReasons?: string[];
  pendingReasons?: string[];
  warn?: boolean;
  needsReview?: boolean;
  reviewLevel?: AdminOperationReviewLevel;
  reviewTitle?: string;
  reviewReasons?: string[];
  signals?: OperationSignal[];
  primarySignal?: OperationSignal | null;
  stringingSummary?: {
    requested: boolean;
    name?: string;
    price?: number;
    mountingFee?: number;
    applicationStatus?: string;
  };
  stage?: string;
  nextAction?: string;
  shippingMethod?: string | null;
  hasShippingInfo?: boolean;
  hasOutboundTracking?: boolean;
  cancel?: {
    status: AdminOperationCancelStatus;
    requestedAt?: string | null;
    handledAt?: string | null;
    reason?: string;
    refundAccountReady?: boolean;
    refundBankLabel?: string | null;
  };
};

export type AdminOperationsGroup = {
  groupKey: string;
  anchorId: string;
  anchorKind: AdminOperationKind;
  createdAt: string | null;
  items: AdminOperationItem[];
  primarySignal: OperationSignal | null;
  signals: OperationSignal[];
  nextAction?: string | null;
};

export type AdminOperationsSummary = {
  urgent: number;
  caution: number;
  pending: number;
};

export type AdminOperationsKindFilter = AdminOperationKind | "all";
export type AdminOperationsWarnFilter =
  | "all"
  | "warn"
  | "caution"
  | "review"
  | "pending"
  | "clean";
export type AdminOperationsWarnSort = "default" | "warn_first" | "safe_first";

export interface AdminOperationsListRequestDto {
  page: number;
  pageSize: number;
  kind: AdminOperationsKindFilter;
  q: string;
  warn: boolean;
  flow: AdminOperationFlow | null;
  integrated: boolean | null;
  warnFilter: AdminOperationsWarnFilter;
  warnSort: AdminOperationsWarnSort;
}

export interface AdminOperationsListResponseDto {
  summary: AdminOperationsSummary;
  groups: AdminOperationsGroup[];
  pagination: {
    page: number;
    pageSize: number;
    totalGroups: number;
  };
  /** @deprecated transitional shape */
  items: AdminOperationItem[];
  /** @deprecated transitional shape */
  total: number;
}
