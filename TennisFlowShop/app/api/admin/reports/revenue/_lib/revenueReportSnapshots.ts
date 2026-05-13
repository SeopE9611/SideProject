import { MongoServerError, type Db, type WithId } from "mongodb";
import { buildRevenueReport } from "./buildRevenueReport";
import type {
  RevenueReportResponse,
  RevenueReportSnapshot,
  RevenueReportSnapshotMeta,
  RevenueReportSnapshotSource,
  RevenueReportSnapshotStatus,
} from "@/types/admin/reports";

export const REVENUE_REPORT_SNAPSHOTS_COLLECTION = "revenue_report_snapshots";
export const REVENUE_REPORT_SNAPSHOT_STATUSES = ["draft", "finalized"] as const;
export const REVENUE_REPORT_YYYY_MM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type RevenueReportSnapshotDoc = {
  yyyymm: string;
  range: RevenueReportResponse["range"];
  report: RevenueReportResponse;
  status: RevenueReportSnapshotStatus;
  memo?: string | null;
  source?: RevenueReportSnapshotSource | null;
  meta?: RevenueReportSnapshotMeta | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
};

type BuiltRevenueReportSnapshotInput = {
  yyyymm: string;
  range: RevenueReportResponse["range"];
  report: RevenueReportResponse;
  status: RevenueReportSnapshotStatus;
  memo?: string | null;
  source?: RevenueReportSnapshotSource | null;
  meta?: RevenueReportSnapshotMeta | null;
};

export type SaveRevenueReportSnapshotResult = {
  snapshot: WithId<RevenueReportSnapshotDoc> | null;
  previousUpdatedAt: string | null;
  duplicateKeyReturnedExisting: boolean;
};

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

export function monthRangeFromYyyymm(yyyymm: string) {
  if (!REVENUE_REPORT_YYYY_MM_RE.test(yyyymm)) return null;
  const [yearRaw, monthRaw] = yyyymm.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${yyyymm}-01`,
    to: `${yyyymm}-${String(lastDay).padStart(2, "0")}`,
    groupBy: "day" as const,
  };
}

export function serializeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function serializeSnapshot(doc: WithId<RevenueReportSnapshotDoc> | null): RevenueReportSnapshot | null {
  if (!doc) return null;
  return {
    id: String(doc._id),
    yyyymm: doc.yyyymm,
    range: doc.range,
    report: doc.report,
    status: doc.status,
    memo: doc.memo ?? null,
    source: doc.source ?? null,
    meta: doc.meta ?? null,
    createdAt: serializeDate(doc.createdAt),
    createdBy: doc.createdBy ?? null,
    updatedAt: serializeDate(doc.updatedAt),
    updatedBy: doc.updatedBy ?? null,
  };
}

export function snapshotTotals(report: RevenueReportResponse) {
  return {
    onlinePaidAmount: report.online.paidAmount,
    onlineRefundedAmount: report.online.refundedAmount,
    offlinePaidAmount: report.offline.paidAmount,
    offlineRefundedAmount: report.offline.refundedAmount,
    offlinePendingAmount: report.offline.pendingAmount,
    combinedPaidAmount: report.combinedPreview.paidAmount,
    combinedNetAmount: report.combinedPreview.netAmount,
    seriesCount: report.series.length,
  };
}

function extractUpdatedDoc<T>(res: unknown): T | null {
  if (res && typeof res === "object" && "value" in res) {
    return ((res as { value?: T | null }).value ?? null) as T | null;
  }
  return (res ?? null) as T | null;
}

function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

function normalizeMemo(memo: string | null | undefined) {
  return memo?.trim() ? memo.trim() : null;
}

export async function buildMonthlyRevenueReportSnapshot(
  db: Db,
  {
    yyyymm,
    status,
    memo,
    source,
    meta,
  }: {
    yyyymm: string;
    status: RevenueReportSnapshotStatus;
    memo?: string | null;
    source?: RevenueReportSnapshotSource | null;
    meta?: RevenueReportSnapshotMeta | null;
  },
): Promise<BuiltRevenueReportSnapshotInput | null> {
  const range = monthRangeFromYyyymm(yyyymm);
  if (!range) return null;

  const report = await buildRevenueReport(db, {
    from: range.from,
    to: range.to,
    groupBy: "day",
  });
  if (!report) return null;

  return {
    yyyymm,
    range: report.range,
    report,
    status,
    memo: normalizeMemo(memo),
    source: source ?? null,
    meta: meta ?? null,
  };
}

export async function saveRevenueReportSnapshot(
  db: Db,
  snapshotInput: BuiltRevenueReportSnapshotInput,
  { actorId }: { actorId: string },
): Promise<SaveRevenueReportSnapshotResult> {
  const now = new Date();
  const collection = db.collection<RevenueReportSnapshotDoc>(REVENUE_REPORT_SNAPSHOTS_COLLECTION);
  const existing = await collection.findOne(
    { yyyymm: snapshotInput.yyyymm },
    { projection: { updatedAt: 1 } },
  );
  const previousUpdatedAt = serializeDate(existing?.updatedAt);

  const setFields: Partial<RevenueReportSnapshotDoc> = {
    range: snapshotInput.range,
    report: snapshotInput.report,
    status: snapshotInput.status,
    memo: snapshotInput.memo ?? null,
    source: snapshotInput.source ?? null,
    meta: snapshotInput.meta ?? null,
    updatedAt: now,
    updatedBy: actorId,
  };

  let result: unknown;
  try {
    result = await collection.findOneAndUpdate(
      { yyyymm: snapshotInput.yyyymm },
      {
        $set: setFields,
        $setOnInsert: {
          yyyymm: snapshotInput.yyyymm,
          createdAt: now,
          createdBy: actorId,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const duplicate = await collection.findOne({ yyyymm: snapshotInput.yyyymm });
    return {
      snapshot: duplicate,
      previousUpdatedAt,
      duplicateKeyReturnedExisting: Boolean(duplicate),
    };
  }

  return {
    snapshot: extractUpdatedDoc<WithId<RevenueReportSnapshotDoc>>(result),
    previousUpdatedAt,
    duplicateKeyReturnedExisting: false,
  };
}
