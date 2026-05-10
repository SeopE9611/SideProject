export type OfflineKind = "stringing" | "package_sale" | "etc";
export type OfflineStatus = "received" | "in_progress" | "completed" | "picked_up" | "canceled";
export type OfflinePaymentStatus = "pending" | "paid" | "refunded";
export type OfflinePaymentMethod = "cash" | "card" | "bank_transfer" | "etc";

export type OfflineLinkedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneMasked?: string | null;
  pointsBalance?: number | null;
};

export type OfflineRecordPoints = {
  earn?: number | null;
  use?: number | null;
  grantTxId?: string | null;
  deductTxId?: string | null;
  grantRevertTxId?: string | null;
  grantRevertedAt?: string | null;
  grantRevertedBy?: string | null;
  grantRevertReason?: string | null;
  deductRevertTxId?: string | null;
  deductRevertedAt?: string | null;
  deductRevertedBy?: string | null;
  deductRevertReason?: string | null;
};

export type OfflineReconciliationStatus = "open" | "resolved" | "ignored";

export type OfflineRecordPackageUsage = {
  passId?: string | null;
  usedCount?: number | null;
  consumptionId?: string | null;
  reverted?: boolean | null;
  revertedAt?: string | null;
  revertedBy?: string | null;
  revertReason?: string | null;
  revertedConsumptionId?: string | null;
  isReverted?: boolean | null;
  reconcileStatus?: OfflineReconciliationStatus | null;
  reconcileNote?: string | null;
  reconciledAt?: string | null;
  reconciledBy?: string | null;
};

export type OfflineServicePassSummary = {
  id: string;
  name?: string | null;
  packageName?: string | null;
  status?: string | null;
  totalCount?: number | null;
  usedCount?: number | null;
  remainingCount?: number | null;
  expiresAt?: string | null;
  createdAt?: string | null;
};

export type OfflinePackageSaleSummary = {
  id: string;
  packageName?: string | null;
  sessions?: number | null;
  price?: number | null;
  paymentMethod?: OfflinePaymentMethod | string | null;
  paymentStatus?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  source?: string | null;
  sourceLabel?: string | null;
  isRefunded?: boolean;
  refundAmount?: number | null;
  refundedAt?: string | null;
  refundReason?: string | null;
  canRefund?: boolean;
  refundBlockedReason?: string | null;
  linkedServicePassIds?: string[];
  passSummary?: Array<{
    id: string;
    status?: string | null;
    usedCount?: number | null;
    remainingCount?: number | null;
  }>;
};

export type OfflineLinkCandidate = OfflineLinkedUser & {
  match: {
    name: boolean;
    phone: boolean;
    email: boolean;
  };
  alreadyLinkedOfflineCustomerId?: string | null;
};

export interface OfflineCustomerDto {
  id: string;
  linkedUserId?: string | null;
  name: string;
  phone: string;
  phoneMasked?: string;
  email?: string | null;
  memo?: string;
  tags?: string[];
  source: "offline_admin";
  stats?: { visitCount: number; totalPaid: number; totalServiceCount: number; lastVisitedAt?: string };
  createdAt?: string;
  updatedAt?: string;
}

export type OfflineReconciliationType = "package_issue" | "package_usage";

export type OfflineReconciliationItem = {
  id: string;
  type: OfflineReconciliationType;
  status: OfflineReconciliationStatus;
  title: string;
  description: string;
  severity: "warning" | "critical";
  createdAt?: string | null;
  updatedAt?: string | null;
  source: Record<string, string | null>;
  customer: { id?: string | null; name: string; phoneMasked?: string | null };
  metadata: Record<string, unknown>;
  links: Record<string, string | null>;
  note?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

export type OfflineReconciliationSummary = {
  open: number;
  packageIssue: number;
  packageUsage: number;
  resolved: number;
  ignored: number;
};

export type OfflineReconciliationResponse = {
  items: OfflineReconciliationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: OfflineReconciliationSummary;
};

export type OfflineRevenueKindBucket = Record<OfflineKind, number>;

export type OfflineRevenueBucket = {
  paidAmount: number;
  refundedAmount: number;
  pendingAmount: number;
  netAmount: number;
  paidCount: number;
  refundedCount: number;
  pendingCount: number;
  totalCount: number;
  byMethod: Record<OfflinePaymentMethod, number>;
};

export type OfflineRecordsRevenueBucket = OfflineRevenueBucket & {
  byKind: OfflineRevenueKindBucket;
};

export type OfflinePackageSalesRevenueBucket = OfflineRevenueBucket & {
  issueFailedCount: number;
  issueFailedAmount: number;
};

export type OfflineRevenueSummary = {
  range: { from: string | null; to: string | null };
  records: OfflineRecordsRevenueBucket;
  packageSales: OfflinePackageSalesRevenueBucket;
  total: OfflineRevenueBucket;
  daily?: Array<{
    date: string;
    recordsPaidAmount: number;
    packageSalesPaidAmount: number;
    totalPaidAmount: number;
  }>;
};
