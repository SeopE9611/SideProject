import type { Db, Document } from "mongodb";
import { OFFLINE_PACKAGE_ORDER_FILTER, isOfflinePackageOrder } from "./packageOrderOffline";
import { isPaidPaymentStatus, orderPaidAmount, toNumber } from "@/app/api/settlements/_lib/settlementPolicy";
import type { OfflinePaymentMethod, OfflineRevenueSummary, OfflineRevenueBucket, OfflineRevenueKindBucket } from "@/types/admin/offline";

const PAYMENT_METHODS: OfflinePaymentMethod[] = ["cash", "card", "bank_transfer", "etc"];
const KIND_KEYS = ["stringing", "package_sale", "etc"] as const;

type DateRange = { from: Date | null; to: Date | null };

type SummaryOptions = DateRange & {
  includePackageSales?: boolean;
  groupBy?: "day" | "month" | null;
};

function emptyMethodMap(): Record<OfflinePaymentMethod, number> {
  return { cash: 0, card: 0, bank_transfer: 0, etc: 0 };
}

function emptyKindMap(): OfflineRevenueKindBucket {
  return { stringing: 0, package_sale: 0, etc: 0 };
}

function emptyBucket(): OfflineRevenueBucket {
  return {
    paidAmount: 0,
    refundedAmount: 0,
    pendingAmount: 0,
    netAmount: 0,
    paidCount: 0,
    refundedCount: 0,
    pendingCount: 0,
    totalCount: 0,
    byMethod: emptyMethodMap(),
  };
}

function normalizePaymentMethod(value: unknown): OfflinePaymentMethod {
  const raw = String(value ?? "").trim();
  if (PAYMENT_METHODS.includes(raw as OfflinePaymentMethod)) return raw as OfflinePaymentMethod;
  if (raw.includes("현금") || raw.toLowerCase() === "cash") return "cash";
  if (raw.includes("카드") || raw.toLowerCase() === "card") return "card";
  if (raw.includes("계좌") || raw.includes("이체") || raw.toLowerCase().includes("bank")) return "bank_transfer";
  return "etc";
}

function normalizePaymentStatus(value: unknown): "paid" | "refunded" | "pending" {
  const raw = String(value ?? "").trim();
  const lower = raw.toLowerCase();
  if (isPaidPaymentStatus(raw)) return "paid";
  if (lower === "refunded" || lower.includes("refund") || raw.includes("환불")) return "refunded";
  return "pending";
}

function effectiveRecordDate(doc: Document): Date | null {
  const value = doc.occurredAt ?? doc.createdAt;
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function effectivePackageOrderDate(doc: Document): Date | null {
  const meta = doc.meta as Record<string, unknown> | undefined;
  const paymentInfo = doc.paymentInfo as Record<string, unknown> | undefined;
  const value = paymentInfo?.approvedAt ?? meta?.paidAt ?? doc.createdAt;
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(date: Date | null, range: DateRange): boolean {
  if (!date) return false;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function groupKey(date: Date, groupBy: "day" | "month"): string {
  const iso = date.toISOString();
  return groupBy === "month" ? iso.slice(0, 7) : iso.slice(0, 10);
}

function addStatusAmount(bucket: OfflineRevenueBucket, status: "paid" | "refunded" | "pending", amount: number, method: OfflinePaymentMethod) {
  bucket.totalCount += 1;
  if (status === "paid") {
    bucket.paidAmount += amount;
    bucket.paidCount += 1;
    bucket.byMethod[method] += amount;
  } else if (status === "refunded") {
    bucket.refundedAmount += amount;
    bucket.refundedCount += 1;
  } else {
    bucket.pendingAmount += amount;
    bucket.pendingCount += 1;
  }
  bucket.netAmount = bucket.paidAmount - bucket.refundedAmount;
}


function getPackageOrderStatus(doc: Document): "paid" | "refunded" | "pending" {
  const paymentInfo = doc.paymentInfo as Record<string, unknown> | undefined;
  return normalizePaymentStatus(doc.paymentStatus ?? paymentInfo?.status ?? doc.status);
}

function getPackageOrderAmount(doc: Document): number {
  const packageInfo = doc.packageInfo as Record<string, unknown> | undefined;
  const paidOrTotal = orderPaidAmount(doc);
  if (paidOrTotal > 0) return paidOrTotal;
  return toNumber(packageInfo?.price);
}

function getPackageOrderMethod(doc: Document): OfflinePaymentMethod {
  const meta = doc.meta as Record<string, unknown> | undefined;
  const paymentInfo = doc.paymentInfo as Record<string, unknown> | undefined;
  return normalizePaymentMethod(meta?.paymentMethod ?? paymentInfo?.method ?? paymentInfo?.provider);
}

export function parseOfflineSummaryDateBoundary(value: string | null, boundary: "from" | "to"): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = dateOnly
    ? new Date(boundary === "from" ? `${trimmed}T00:00:00.000Z` : `${trimmed}T23:59:59.999Z`)
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function buildOfflineRevenueSummary(db: Db, options: SummaryOptions): Promise<OfflineRevenueSummary> {
  const includePackageSales = options.includePackageSales !== false;
  const range = { from: options.from, to: options.to };
  const records = emptyBucket() as OfflineRevenueBucket & { byKind: OfflineRevenueKindBucket };
  records.byKind = emptyKindMap();
  const packageSales = emptyBucket() as OfflineRevenueBucket & { issueFailedCount: number; issueFailedAmount: number };
  packageSales.issueFailedCount = 0;
  packageSales.issueFailedAmount = 0;

  const dailyMap = new Map<string, { date: string; recordsPaidAmount: number; packageSalesPaidAmount: number; totalPaidAmount: number }>();
  const ensureDaily = (date: Date) => {
    const key = groupKey(date, options.groupBy === "month" ? "month" : "day");
    let entry = dailyMap.get(key);
    if (!entry) {
      entry = { date: key, recordsPaidAmount: 0, packageSalesPaidAmount: 0, totalPaidAmount: 0 };
      dailyMap.set(key, entry);
    }
    return entry;
  };

  const recordFilter = range.from || range.to
    ? {
        $or: [
          { occurredAt: { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) } },
          { occurredAt: { $exists: false }, createdAt: { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) } },
          { occurredAt: null, createdAt: { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) } },
        ],
      }
    : {};

  const recordDocs = await db.collection("offline_service_records").find(recordFilter, { projection: { occurredAt: 1, createdAt: 1, kind: 1, payment: 1 } }).toArray();
  for (const doc of recordDocs) {
    const date = effectiveRecordDate(doc);
    if (!inRange(date, range)) continue;
    const payment = doc.payment as Record<string, unknown> | undefined;
    const status = normalizePaymentStatus(payment?.status);
    const amount = Math.max(0, toNumber(payment?.amount));
    const method = normalizePaymentMethod(payment?.method);
    const kind = KIND_KEYS.includes(doc.kind as typeof KIND_KEYS[number]) ? doc.kind as keyof OfflineRevenueKindBucket : "etc";
    addStatusAmount(records, status, amount, method);
    if (status === "paid") {
      records.byKind[kind] += amount;
      if (date) {
        const daily = ensureDaily(date);
        daily.recordsPaidAmount += amount;
        daily.totalPaidAmount += amount;
      }
    }
  }

  if (includePackageSales) {
    const packageDocs = await db.collection("packageOrders")
      .find(
        OFFLINE_PACKAGE_ORDER_FILTER,
        { projection: { createdAt: 1, status: 1, paymentStatus: 1, paymentInfo: 1, paidAmount: 1, totalPrice: 1, packageInfo: 1, meta: 1 } },
      )
      .toArray();
    for (const doc of packageDocs) {
      if (!isOfflinePackageOrder(doc)) continue;
      const date = effectivePackageOrderDate(doc);
      if (!inRange(date, range)) continue;
      const status = getPackageOrderStatus(doc);
      const amount = Math.max(0, getPackageOrderAmount(doc));
      const method = getPackageOrderMethod(doc);
      addStatusAmount(packageSales, status, amount, method);
      const meta = doc.meta as Record<string, unknown> | undefined;
      if (meta?.requiresOfflineIssueReconcile === true) {
        packageSales.issueFailedCount += 1;
        packageSales.issueFailedAmount += amount;
      }
      if (status === "paid" && date) {
        const daily = ensureDaily(date);
        daily.packageSalesPaidAmount += amount;
        daily.totalPaidAmount += amount;
      }
    }
  }

  const total = emptyBucket();
  total.paidAmount = records.paidAmount + packageSales.paidAmount;
  total.refundedAmount = records.refundedAmount + packageSales.refundedAmount;
  total.pendingAmount = records.pendingAmount + packageSales.pendingAmount;
  total.netAmount = total.paidAmount - total.refundedAmount;
  total.paidCount = records.paidCount + packageSales.paidCount;
  total.refundedCount = records.refundedCount + packageSales.refundedCount;
  total.pendingCount = records.pendingCount + packageSales.pendingCount;
  total.totalCount = records.totalCount + packageSales.totalCount;
  total.byMethod = emptyMethodMap();
  for (const method of PAYMENT_METHODS) total.byMethod[method] = records.byMethod[method] + packageSales.byMethod[method];

  return {
    range: {
      from: options.from ? options.from.toISOString() : null,
      to: options.to ? options.to.toISOString() : null,
    },
    records,
    packageSales,
    total,
    ...(options.groupBy ? { daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)) } : {}),
  };
}
