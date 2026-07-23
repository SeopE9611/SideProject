export type AdminPackageType = "10회권" | "30회권" | "50회권" | "100회권";
export type AdminPackageServiceType = "방문" | "출장";
export type AdminPackagePassStatus = "비활성" | "활성" | "종료" | "만료" | "취소";
export type AdminPackagePassStatusDetail = "대기" | "일시정지" | AdminPackagePassStatus;
export type AdminPackagePaymentStatus = "결제완료" | "결제대기" | "결제취소";
export type AdminPackagePaymentState =
  | "not_required"
  | "bank_pending"
  | "pg_pending"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunding"
  | "refunded"
  | "unknown";
export type AdminPackageUsageState =
  | "available"
  | "paused"
  | "exhausted"
  | "expired"
  | "cancelled"
  | "not_issued"
  | "unknown";
export type AdminPackageActivationState =
  | "active"
  | "awaiting_payment"
  | "pending_issue"
  | "paused"
  | "ended"
  | "cancelled"
  | "failed"
  | "unknown";
export type AdminPackageAttentionReason =
  | "payment_pending"
  | "payment_failed"
  | "payment_refunding"
  | "payment_unknown"
  | "pass_issue_pending"
  | "pass_paused"
  | "pass_unknown"
  | "terminal_payment_with_live_pass";

export interface AdminPackageOperationCapabilities {
  canExtend: boolean;
  canAdjustSessions: boolean;
  blockReasons: string[];
}

export interface AdminPackageCustomerDto {
  name?: string;
  email?: string;
  phone?: string;
}

export interface AdminPackageListItemDto {
  id: string;
  userId: string;
  customer: AdminPackageCustomerDto;
  packageType: string;
  totalSessions: number | null;
  remainingSessions: number | null;
  usedSessions: number | null;
  price: number | null;
  rawOrderStatus: string | null;
  rawPaymentStatus: string | null;
  rawPassStatus: string | null;
  hasIssuedPass: boolean;
  paymentState: AdminPackagePaymentState;
  paymentNeedsCheck: boolean;
  usageState: AdminPackageUsageState;
  activationState: AdminPackageActivationState;
  requiresAttention: boolean;
  attentionReasons: AdminPackageAttentionReason[];
  daysUntilExpiry: number | null;
  isExpirySoon: boolean;
  progressPercent: number | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  legacyPassStatus: AdminPackagePassStatusDetail;
  legacyPaymentStatus: AdminPackagePaymentStatus | null;
  passStatus: AdminPackagePassStatusDetail;
  paymentStatus: string | null;
  serviceType: AdminPackageServiceType;
}

export interface AdminPackageMetricsDto {
  total: number;
  available: number;
  needsAttention: number;
  revenue: number;
  expirySoon: number;
}

export interface AdminPackageListResponseDto {
  items: AdminPackageListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  metrics: AdminPackageMetricsDto;
}

export interface AdminPackageOperationHistoryDto {
  id: string;
  date: string;
  extendedSessions?: number;
  extendedDays?: number;
  reason?: string;
  adminName?: string;
  adminEmail?: string;
  from?: string | null;
  to?: string | null;
  paymentStatus?: AdminPackagePaymentStatus | "취소";
  eventType?: "extend_expiry" | "adjust_sessions" | "payment_status_change";
}

export interface AdminPackageUsageHistoryDto {
  id: string;
  applicationId: string;
  date: string;
  sessionsUsed: number;
  summary: string;
  applicationSummary?: string;
  adminNote?: string;
}

export interface AdminPackageUsageHistoryResponseDto {
  items: AdminPackageUsageHistoryDto[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface AdminPackageDetailDto {
  id: string;
  userId?: string;
  customer: Required<AdminPackageCustomerDto>;
  packageType: string;
  totalSessions: number | null;
  remainingSessions: number | null;
  usedSessions: number | null;
  price: number | null;
  rawOrderStatus: string | null;
  rawPaymentStatus: string | null;
  rawPassStatus: string | null;
  hasIssuedPass: boolean;
  paymentState: AdminPackagePaymentState;
  paymentNeedsCheck: boolean;
  usageState: AdminPackageUsageState;
  activationState: AdminPackageActivationState;
  requiresAttention: boolean;
  attentionReasons: AdminPackageAttentionReason[];
  daysUntilExpiry: number | null;
  isExpirySoon: boolean;
  progressPercent: number | null;
  purchaseDate: string;
  expiryDate: string | null;
  legacyPassStatus: AdminPackagePassStatusDetail;
  legacyPaymentStatus: AdminPackagePaymentStatus | null;
  passStatus: AdminPackagePassStatusDetail;
  paymentStatus: string | null;
  operationCapabilities: AdminPackageOperationCapabilities;
  paymentMethod?: string | null;
  paymentProvider?: string | null;
  paymentTid?: string | null;
  paymentCardDisplayName?: string | null;
  paymentCardCompany?: string | null;
  paymentCardLabel?: string | null;
  paymentNiceSync?: {
    lastSyncedAt?: string | null;
    source?: string | null;
    pgStatus?: string | null;
    resultCode?: string | null;
    resultMsg?: string | null;
    canceledAt?: string | null;
    cancelAmount?: number;
  } | null;
  serviceType: AdminPackageServiceType;
  operationsHistory: AdminPackageOperationHistoryDto[];
  extensionHistory?: AdminPackageOperationHistoryDto[];
}
