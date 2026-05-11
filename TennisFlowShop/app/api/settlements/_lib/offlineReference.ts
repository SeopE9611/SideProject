import type { Db } from "mongodb";
import { buildOfflineRevenueSummary } from "@/app/api/admin/offline/_lib/revenueSummary";
import type {
  OfflinePaymentMethod,
  OfflineRevenueBucket,
  OfflineRevenueSummary,
} from "@/types/admin/offline";

export const OFFLINE_SETTLEMENT_NOTICE =
  "오프라인 매출은 기존 PG 정산 payout 공식에 포함되지 않는 참고 항목입니다.";

type OfflineReferenceBucket = Omit<
  OfflineRevenueBucket,
  "totalCount" | "byMethod"
>;

export type OfflineSettlementReference = {
  range: { from: string; to: string };
  records: OfflineReferenceBucket;
  packageSales: OfflineReferenceBucket & {
    issueFailedCount?: number;
    issueFailedAmount?: number;
  };
  total: OfflineReferenceBucket;
  byMethod: Record<OfflinePaymentMethod, number>;
  notice: typeof OFFLINE_SETTLEMENT_NOTICE;
};

function toInclusiveEnd(endExclusive: Date): Date {
  return new Date(endExclusive.getTime() - 1);
}

function pickBucket(bucket: OfflineRevenueBucket): OfflineReferenceBucket {
  return {
    paidAmount: bucket.paidAmount,
    refundedAmount: bucket.refundedAmount,
    pendingAmount: bucket.pendingAmount,
    netAmount: bucket.netAmount,
    paidCount: bucket.paidCount,
    refundedCount: bucket.refundedCount,
    pendingCount: bucket.pendingCount,
  };
}

export function mapOfflineSummaryToSettlementReference(
  summary: OfflineRevenueSummary,
): OfflineSettlementReference {
  return {
    range: {
      from: summary.range.from ?? "",
      to: summary.range.to ?? "",
    },
    records: pickBucket(summary.records),
    packageSales: {
      ...pickBucket(summary.packageSales),
      issueFailedCount: summary.packageSales.issueFailedCount,
      issueFailedAmount: summary.packageSales.issueFailedAmount,
    },
    total: pickBucket(summary.total),
    byMethod: summary.total.byMethod,
    notice: OFFLINE_SETTLEMENT_NOTICE,
  };
}

export async function buildOfflineSettlementReference(
  db: Db,
  range: { from: Date; toExclusive: Date },
): Promise<OfflineSettlementReference> {
  const summary = await buildOfflineRevenueSummary(db, {
    from: range.from,
    to: toInclusiveEnd(range.toExclusive),
    includePackageSales: true,
  });
  return mapOfflineSummaryToSettlementReference(summary);
}
