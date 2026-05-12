import type { Db, Document } from "mongodb";
import { EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER } from "@/app/api/admin/offline/_lib/packageOrderOffline";
import { buildOfflineRevenueSummary } from "@/app/api/admin/offline/_lib/revenueSummary";
import {
  applicationPaidAmount,
  buildPaidMatch,
  buildRentalPaidMatch,
  isStandaloneStringingApplication,
  orderPaidAmount,
  refundsAmount,
  rentalPaidAmount,
} from "@/app/api/settlements/_lib/settlementPolicy";
import type {
  RevenueReportGroupBy,
  RevenueReportOnlineBucket,
  RevenueReportResponse,
  RevenueReportSeriesPoint,
} from "@/types/admin/reports";

export const COMBINED_PREVIEW_NOTE =
  "온라인 + 오프라인 단순 참고 합계이며 정산 지급액 계산에는 사용되지 않습니다." as const;

export type RevenueReportDateRange = {
  from: Date;
  toInclusive: Date;
  toExclusive: Date;
  fromLabel: string;
  toLabel: string;
};

type OnlineSeriesAccumulator = {
  orders: number;
  stringingApplications: number;
  packageOrders: number;
  rentals: number;
};

export function parseReportDate(value: string | null, boundary: "from" | "to"): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return boundary === "from"
      ? new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0))
      : new Date(Date.UTC(year, month - 1, day + 1, -9, 0, 0, -1));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatKstYmd(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function defaultRevenueReportDateRange(): RevenueReportDateRange {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  const from = new Date(Date.UTC(y, m, 1, -9, 0, 0, 0));
  const toInclusive = new Date(Date.UTC(y, m, d + 1, -9, 0, 0, -1));
  return {
    from,
    toInclusive,
    toExclusive: new Date(toInclusive.getTime() + 1),
    fromLabel: formatKstYmd(from),
    toLabel: formatKstYmd(toInclusive),
  };
}

export function buildRevenueReportDateRange(fromParam: string | null, toParam: string | null): RevenueReportDateRange | null {
  if (!fromParam && !toParam) return defaultRevenueReportDateRange();
  const fallback = defaultRevenueReportDateRange();
  const parsedFrom = parseReportDate(fromParam, "from");
  const parsedTo = parseReportDate(toParam, "to");
  if ((fromParam && !parsedFrom) || (toParam && !parsedTo)) return null;

  const from = parsedFrom ?? fallback.from;
  const toInclusive = parsedTo ?? fallback.toInclusive;
  return {
    from,
    toInclusive,
    toExclusive: new Date(toInclusive.getTime() + 1),
    fromLabel: fromParam ?? formatKstYmd(from),
    toLabel: toParam ?? formatKstYmd(toInclusive),
  };
}

function groupKey(dateValue: unknown, groupBy: RevenueReportGroupBy): string | null {
  const date = dateValue instanceof Date ? dateValue : new Date(String(dateValue ?? ""));
  if (Number.isNaN(date.getTime())) return null;
  const ymd = formatKstYmd(date);
  return groupBy === "month" ? ymd.slice(0, 7) : ymd;
}

function addOnlineSeries(
  map: Map<string, OnlineSeriesAccumulator>,
  key: string | null,
  source: keyof OnlineSeriesAccumulator,
  amount: number,
) {
  if (!key) return;
  const current = map.get(key) ?? {
    orders: 0,
    stringingApplications: 0,
    packageOrders: 0,
    rentals: 0,
  };
  current[source] += amount;
  map.set(key, current);
}

async function buildOnlineRevenueReport(
  db: Db,
  range: RevenueReportDateRange,
  groupBy: RevenueReportGroupBy,
): Promise<{ bucket: RevenueReportOnlineBucket; series: Map<string, OnlineSeriesAccumulator> }> {
  const paidMatch = buildPaidMatch(["paymentStatus", "paymentInfo.status"]);
  const dateMatch = { createdAt: { $gte: range.from, $lt: range.toExclusive } };

  const [orders, apps, packageOrders, rentals] = await Promise.all([
    db.collection("orders").find(
      { $and: [dateMatch, paidMatch] },
      { projection: { createdAt: 1, paidAmount: 1, totalPrice: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } },
    ).toArray(),
    db.collection("stringing_applications").find(
      { $and: [dateMatch, paidMatch] },
      { projection: { createdAt: 1, totalPrice: 1, serviceAmount: 1, orderId: 1, rentalId: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } },
    ).toArray(),
    db.collection("packageOrders").find(
      { $and: [EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER, dateMatch, paidMatch] },
      { projection: { createdAt: 1, paidAmount: 1, totalPrice: 1, refunds: 1, paymentStatus: 1, paymentInfo: 1 } },
    ).toArray(),
    db.collection("rental_orders").find(
      { $and: [dateMatch, buildRentalPaidMatch()] },
      { projection: { createdAt: 1, status: 1, paidAt: 1, payment: 1, amount: 1 } },
    ).toArray(),
  ]);

  const standaloneApps = apps.filter((doc: Document) => isStandaloneStringingApplication(doc));
  const series = new Map<string, OnlineSeriesAccumulator>();

  let ordersPaid = 0;
  let appsPaid = 0;
  let packagesPaid = 0;
  let rentalsPaid = 0;
  let refundedAmount = 0;

  for (const doc of orders) {
    const amount = orderPaidAmount(doc);
    ordersPaid += amount;
    refundedAmount += refundsAmount(doc);
    addOnlineSeries(series, groupKey(doc.createdAt, groupBy), "orders", amount);
  }
  for (const doc of standaloneApps) {
    const amount = applicationPaidAmount(doc);
    appsPaid += amount;
    refundedAmount += refundsAmount(doc);
    addOnlineSeries(series, groupKey(doc.createdAt, groupBy), "stringingApplications", amount);
  }
  for (const doc of packageOrders) {
    const amount = orderPaidAmount(doc);
    packagesPaid += amount;
    refundedAmount += refundsAmount(doc);
    addOnlineSeries(series, groupKey(doc.createdAt, groupBy), "packageOrders", amount);
  }
  for (const doc of rentals) {
    const amount = rentalPaidAmount(doc);
    rentalsPaid += amount;
    addOnlineSeries(series, groupKey(doc.createdAt, groupBy), "rentals", amount);
  }

  const paidAmount = ordersPaid + appsPaid + packagesPaid + rentalsPaid;
  return {
    bucket: {
      paidAmount,
      refundedAmount,
      netAmount: paidAmount - refundedAmount,
      count: orders.length + standaloneApps.length + packageOrders.length + rentals.length,
      bySource: {
        orders: ordersPaid,
        stringingApplications: appsPaid,
        packageOrders: packagesPaid,
        rentals: rentalsPaid,
      },
    },
    series,
  };
}

export async function buildRevenueReport(
  db: Db,
  { from, to, groupBy }: { from: string | null; to: string | null; groupBy: RevenueReportGroupBy },
): Promise<RevenueReportResponse | null> {
  const range = buildRevenueReportDateRange(from, to);
  if (!range || range.from > range.toInclusive) return null;

  const [onlineReport, offlineSummary] = await Promise.all([
    buildOnlineRevenueReport(db, range, groupBy),
    buildOfflineRevenueSummary(db, {
      from: range.from,
      to: range.toInclusive,
      includePackageSales: true,
      groupBy,
    }),
  ]);

  const seriesMap = new Map<string, RevenueReportSeriesPoint>();
  for (const [date, item] of onlineReport.series.entries()) {
    const onlinePaidAmount = item.orders + item.stringingApplications + item.packageOrders + item.rentals;
    seriesMap.set(date, { date, onlinePaidAmount, offlinePaidAmount: 0, combinedPaidAmount: onlinePaidAmount });
  }
  for (const item of offlineSummary.daily ?? []) {
    const current = seriesMap.get(item.date) ?? { date: item.date, onlinePaidAmount: 0, offlinePaidAmount: 0, combinedPaidAmount: 0 };
    current.offlinePaidAmount = item.totalPaidAmount;
    current.combinedPaidAmount = current.onlinePaidAmount + current.offlinePaidAmount;
    seriesMap.set(item.date, current);
  }

  return {
    range: { from: range.fromLabel, to: range.toLabel, groupBy },
    online: onlineReport.bucket,
    offline: {
      paidAmount: offlineSummary.total.paidAmount,
      refundedAmount: offlineSummary.total.refundedAmount,
      pendingAmount: offlineSummary.total.pendingAmount,
      netAmount: offlineSummary.total.netAmount,
      recordsPaidAmount: offlineSummary.records.paidAmount,
      packageSalesPaidAmount: offlineSummary.packageSales.paidAmount,
      byMethod: offlineSummary.total.byMethod,
      issueFailedCount: offlineSummary.packageSales.issueFailedCount,
      issueFailedAmount: offlineSummary.packageSales.issueFailedAmount,
    },
    combinedPreview: {
      paidAmount: onlineReport.bucket.paidAmount + offlineSummary.total.paidAmount,
      refundedAmount: onlineReport.bucket.refundedAmount + offlineSummary.total.refundedAmount,
      netAmount: onlineReport.bucket.netAmount + offlineSummary.total.netAmount,
      note: COMBINED_PREVIEW_NOTE,
    },
    series: Array.from(seriesMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
