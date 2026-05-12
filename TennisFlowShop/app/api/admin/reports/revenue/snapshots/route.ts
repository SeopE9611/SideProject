import { NextResponse } from "next/server";
import { MongoServerError, type WithId } from "mongodb";
import { z } from "zod";
import { buildRevenueReport } from "../_lib/buildRevenueReport";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import type {
  RevenueReportResponse,
  RevenueReportSnapshot,
  RevenueReportSnapshotStatus,
} from "@/types/admin/reports";

const COLLECTION = "revenue_report_snapshots";
const SNAPSHOT_STATUSES = ["draft", "finalized"] as const;
const YYYY_MM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type RevenueReportSnapshotDoc = {
  yyyymm: string;
  range: RevenueReportResponse["range"];
  report: RevenueReportResponse;
  status: RevenueReportSnapshotStatus;
  memo?: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
};

const saveSchema = z.object({
  yyyymm: z.string().regex(YYYY_MM_RE, "invalid yyyymm"),
  status: z.enum(SNAPSHOT_STATUSES).optional().default("draft"),
  memo: z.string().trim().max(1000).optional().nullable(),
});

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

function monthRangeFromYyyymm(yyyymm: string) {
  if (!YYYY_MM_RE.test(yyyymm)) return null;
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

function serializeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function serializeSnapshot(doc: WithId<RevenueReportSnapshotDoc> | null): RevenueReportSnapshot | null {
  if (!doc) return null;
  return {
    id: String(doc._id),
    yyyymm: doc.yyyymm,
    range: doc.range,
    report: doc.report,
    status: doc.status,
    memo: doc.memo ?? null,
    createdAt: serializeDate(doc.createdAt),
    createdBy: doc.createdBy ?? null,
    updatedAt: serializeDate(doc.updatedAt),
    updatedBy: doc.updatedBy ?? null,
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

function snapshotTotals(report: RevenueReportResponse) {
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

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const yyyymm = url.searchParams.get("yyyymm")?.trim() ?? "";
  const collection = guard.db.collection<RevenueReportSnapshotDoc>(COLLECTION);

  if (yyyymm) {
    if (!YYYY_MM_RE.test(yyyymm)) {
      return NextResponse.json({ message: "invalid yyyymm" }, { status: 400 });
    }
    const doc = await collection.findOne({ yyyymm });
    return NextResponse.json({ item: serializeSnapshot(doc) });
  }

  const page = parsePositiveInt(url.searchParams.get("page"), 1, 10000);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 20, 100);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    collection.find({}).sort({ updatedAt: -1, yyyymm: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments({}),
  ]);

  return NextResponse.json({
    items: items.map((item) => serializeSnapshot(item)).filter(Boolean),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "invalid snapshot input" }, { status: 400 });
  }

  const range = monthRangeFromYyyymm(parsed.data.yyyymm);
  if (!range) return NextResponse.json({ message: "invalid yyyymm" }, { status: 400 });

  const report = await buildRevenueReport(guard.db, {
    from: range.from,
    to: range.to,
    groupBy: "day",
  });
  if (!report) return NextResponse.json({ message: "failed to build revenue report" }, { status: 500 });

  const now = new Date();
  const actorId = guard.admin._id.toHexString();
  const collection = guard.db.collection<RevenueReportSnapshotDoc>(COLLECTION);
  const existing = await collection.findOne(
    { yyyymm: parsed.data.yyyymm },
    { projection: { updatedAt: 1 } },
  );
  const previousUpdatedAt = serializeDate(existing?.updatedAt);

  let result: unknown;
  try {
    result = await collection.findOneAndUpdate(
      { yyyymm: parsed.data.yyyymm },
      {
        $set: {
          range: report.range,
          report,
          status: parsed.data.status,
          memo: parsed.data.memo?.trim() ? parsed.data.memo.trim() : null,
          updatedAt: now,
          updatedBy: actorId,
        },
        $setOnInsert: {
          yyyymm: parsed.data.yyyymm,
          createdAt: now,
          createdBy: actorId,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const duplicate = await collection.findOne({ yyyymm: parsed.data.yyyymm });
    if (duplicate) {
      return NextResponse.json({ item: serializeSnapshot(duplicate) });
    }

    return NextResponse.json(
      { message: "snapshot already exists for this month. please retry." },
      { status: 409 },
    );
  }

  const updated = extractUpdatedDoc<WithId<RevenueReportSnapshotDoc>>(result);
  if (!updated) return NextResponse.json({ message: "failed to save snapshot" }, { status: 500 });

  await appendAudit(
    guard.db,
    {
      type: "revenue_report_snapshot_save",
      actorId: guard.admin._id,
      targetId: updated._id,
      message: "월별 매출 리포트 스냅샷 저장",
      diff: {
        yyyymm: updated.yyyymm,
        status: updated.status,
        memo: updated.memo ?? null,
        snapshotId: String(updated._id),
        previousUpdatedAt,
        totals: snapshotTotals(report),
      },
    },
    req,
  );

  return NextResponse.json({ item: serializeSnapshot(updated) });
}
