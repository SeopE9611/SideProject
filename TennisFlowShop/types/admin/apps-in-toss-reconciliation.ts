export const APPS_IN_TOSS_ATTENTION_ISSUE_TYPES = [
  "reconciliation_required",
  "compensation_refund_required",
  "execution_lease_expired",
  "refund_lease_expired",
  "finalization_stale",
  "state_inconsistent",
] as const;

export type AppsInTossAttentionIssueType = (typeof APPS_IN_TOSS_ATTENTION_ISSUE_TYPES)[number];
export type AppsInTossAttentionSeverity = "critical" | "warning";

export type AppsInTossReconciliationItem = {
  id: string;
  attemptId: string;
  issueType: AppsInTossAttentionIssueType;
  severity: AppsInTossAttentionSeverity;
  state: string;
  environment: "live" | "test";
  amount: number;
  customer: { name: string; emailMasked: string | null; phoneMasked: string | null; userId: string };
  product: { name: string | null; selectedColor: string | null; selectedGauge: string | null };
  collection: { method: string | null; preferredDate: string | null; preferredTime: string | null };
  failure: { stage: string | null; code: string | null; finalizationCode: string | null };
  timestamps: {
    createdAt: string | null; updatedAt: string | null; paidAt: string | null;
    finalizationFailedAt: string | null; executionClaimedAt: string | null;
    executionLeaseUntil: string | null; refundClaimedAt: string | null; refundLeaseUntil: string | null;
  };
  links: { orderAdminUrl: string | null; userAdminUrl: string | null };
  nextAction: string;
};

export type AppsInTossReconciliationSummary = {
  total: number; reconciliationRequired: number; compensationRefundRequired: number;
  executionLeaseExpired: number; refundLeaseExpired: number; finalizationStale: number; stateInconsistent: number;
};

export type AppsInTossReconciliationResponse = {
  items: AppsInTossReconciliationItem[];
  page: number; limit: number; total: number; totalPages: number;
  summary: AppsInTossReconciliationSummary;
};
