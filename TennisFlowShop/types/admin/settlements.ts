import type { OfflinePaymentMethod } from "@/types/admin/offline";

export type SettlementTotals = {
  paid: number;
  refund: number;
  net: number;
  rentalDeposit?: number;
};

export type SettlementBreakdown = {
  orders: number;
  applications: number;
  packages: number;
  rentals?: number;
};

export type OfflineSettlementReferenceBucket = {
  paidAmount: number;
  refundedAmount: number;
  pendingAmount: number;
  netAmount: number;
  paidCount: number;
  refundedCount: number;
  pendingCount: number;
};

export type OfflineSettlementReference = {
  range: { from: string; to: string };
  records: OfflineSettlementReferenceBucket;
  packageSales: OfflineSettlementReferenceBucket & {
    issueFailedCount?: number;
    issueFailedAmount?: number;
  };
  total: OfflineSettlementReferenceBucket;
  byMethod: Record<OfflinePaymentMethod, number>;
  notice: string;
};

export type SettlementSnapshot = {
  yyyymm: string;
  totals: SettlementTotals;
  breakdown: SettlementBreakdown;
  createdAt?: string;
  lastGeneratedAt?: string;
  offline?: OfflineSettlementReference;
};

export type SettlementLiveResponse = {
  range: { from: string; to: string };
  totals: SettlementTotals;
  breakdown: Required<SettlementBreakdown>;
  offline?: OfflineSettlementReference;
};

export type SettlementDiffMetrics = {
  paid: number;
  refund: number;
  net: number;
  orders: number;
  applications: number;
  packages: number;
};

export type SettlementDiff = {
  live: SettlementDiffMetrics;
  snap: SettlementDiffMetrics;
};
