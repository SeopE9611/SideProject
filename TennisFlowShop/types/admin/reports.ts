import type { OfflinePaymentMethod } from "@/types/admin/offline";

export type RevenueReportGroupBy = "day" | "month";

export type RevenueReportOnlineBucket = {
  paidAmount: number;
  refundedAmount: number;
  netAmount: number;
  count: number;
  bySource: {
    orders: number;
    stringingApplications: number;
    packageOrders: number;
    rentals: number;
  };
};

export type RevenueReportOfflineBucket = {
  paidAmount: number;
  refundedAmount: number;
  pendingAmount: number;
  netAmount: number;
  recordsPaidAmount: number;
  packageSalesPaidAmount: number;
  byMethod: Record<OfflinePaymentMethod, number>;
  issueFailedCount?: number;
  issueFailedAmount?: number;
};

export type RevenueReportCombinedPreview = {
  paidAmount: number;
  refundedAmount: number;
  netAmount: number;
  note: "온라인 + 오프라인 단순 참고 합계이며 정산 지급액 계산에는 사용되지 않습니다.";
};

export type RevenueReportSeriesPoint = {
  date: string;
  onlinePaidAmount: number;
  offlinePaidAmount: number;
  combinedPaidAmount: number;
};

export type RevenueReportResponse = {
  range: {
    from: string;
    to: string;
    groupBy: RevenueReportGroupBy;
  };
  online: RevenueReportOnlineBucket;
  offline: RevenueReportOfflineBucket;
  combinedPreview: RevenueReportCombinedPreview;
  series: RevenueReportSeriesPoint[];
};
