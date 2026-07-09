/**
 * Responsibility: mapping only (admin operations 도메인 타입 정의).
 * - API route 로직은 이 파일을 import 해서 도메인 타입을 공유합니다.
 */
export type AdminOperationKind = "order" | "stringing_application" | "rental" | "package_purchase";
export type AdminOperationFlow = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type SettlementAnchor = "order" | "rental" | "application" | "package_purchase";
export type AdminOperationReviewLevel = "none" | "info" | "action";
export type AdminOperationCancelStatus =
  | "none"
  | "requested"
  | "approved"
  | "rejected"
  | "approved_pending_pg_cancel";

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

export type LinkedFlowStatusIssue = {
  severity: "warning" | "review";
  code: "LINKED_DOC_MISSING" | "LINKED_DOC_REFERENCE_MISMATCH" | "LINKED_STATUS_MISMATCH";
  title: string;
  message: string;
  orderStatus: string;
  applicationStatus: string;
  actionHref: string;
  actionLabel: string;
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
  paymentProvider?: string | null;
  paymentTid?: string | null;
  paymentInfo?: {
    provider?: string | null;
    tid?: string | null;
    status?: string | null;
    niceSync?: { pgStatus?: string | null; lastSyncedAt?: string | null } | null;
  } | null;
  canSyncNicePayment?: boolean;
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
  shippingFollowupRequired?: boolean;
  needsCancelFinalization?: boolean;
  rentalDueAt?: string | null;
  depositRefundedAt?: string | null;
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
  linkedFlowStatusIssue?: LinkedFlowStatusIssue | null;
  groupReviewLevel?: AdminOperationReviewLevel;
  groupNeedsReview?: boolean;
  groupQueueBucket?: "urgent" | "caution" | "pending" | "clean";
};

export type AdminOperationsSummary = {
  urgent: number;
  caution: number;
  pending: number;
};

export type OperationGroupCounts = {
  totalRepresentativeTasks: number;
  todayRepresentativeTasks?: number;
};

export type OperationSignalCounts = {
  cancelRequests: number;
  paymentCheck: number;
  packagePaymentCheck: number;
  shippingMissing: number;
  stringingWork: number;
  rentalDue: number;
  linkedReview: number;
  offline: number;
  academyApplications: number;
};

export type OperationTaskCounts = {
  cancelRequests: number;
  paymentCheck: number;
  packagePaymentCheck: number;
  shippingMissing: number;
  stringingWork: number;
  rentalDue: number;
  linkedReview: number;
  offline: number;
  academyApplications: number;
};

export type AdminDailyOperationsSummaryResponse = {
  date: string;
  completedToday: {
    orders: number;
    stringingApplications: number;
    rentals: number;
    offline: number;
    academyApplications: number;
    total: number;
  };
  remaining: OperationTaskCounts & { total: number };
  operationGroupCounts?: OperationGroupCounts;
  operationSignalCounts?: OperationSignalCounts;
  attention: {
    urgentRemaining: number;
    watchRemaining: number;
    message: string;
  };
};

export type AdminOperationsKindFilter = AdminOperationKind | "all";
export type AdminOperationsWarnFilter = "all" | "warn" | "caution" | "review" | "pending" | "clean";
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
  summaryAll: AdminOperationsSummary;
  groups: AdminOperationsGroup[];
  operationGroupCounts?: OperationGroupCounts;
  operationSignalCounts?: OperationSignalCounts;
  pagination: {
    page: number;
    pageSize: number;
    totalGroupsAll: number;
    filteredGroupsCount: number;
    totalGroups: number;
  };
  /** @deprecated transitional shape */
  items?: AdminOperationItem[];
  /** @deprecated transitional shape */
  total?: number;
}
