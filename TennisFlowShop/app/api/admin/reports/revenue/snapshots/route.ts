import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import {
  buildMonthlyRevenueReportSnapshot,
  parsePositiveInt,
  REVENUE_REPORT_SNAPSHOT_STATUSES,
  REVENUE_REPORT_SNAPSHOTS_COLLECTION,
  REVENUE_REPORT_YYYY_MM_RE,
  saveRevenueReportSnapshot,
  serializeSnapshot,
  snapshotTotals,
  type RevenueReportSnapshotDoc,
} from "../_lib/revenueReportSnapshots";

const saveSchema = z.object({
  yyyymm: z.string().regex(REVENUE_REPORT_YYYY_MM_RE, "invalid yyyymm"),
  status: z.enum(REVENUE_REPORT_SNAPSHOT_STATUSES).optional().default("draft"),
  memo: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const yyyymm = url.searchParams.get("yyyymm")?.trim() ?? "";
  const collection = guard.db.collection<RevenueReportSnapshotDoc>(
    REVENUE_REPORT_SNAPSHOTS_COLLECTION,
  );

  if (yyyymm) {
    if (!REVENUE_REPORT_YYYY_MM_RE.test(yyyymm)) {
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

  const actorId = guard.admin._id.toHexString();
  const snapshotInput = await buildMonthlyRevenueReportSnapshot(guard.db, {
    yyyymm: parsed.data.yyyymm,
    status: parsed.data.status,
    memo: parsed.data.memo,
    source: "manual",
    meta: { source: "manual_save" },
  });
  if (!snapshotInput)
    return NextResponse.json({ message: "failed to build revenue report" }, { status: 500 });

  const { snapshot, previousUpdatedAt, duplicateKeyReturnedExisting } =
    await saveRevenueReportSnapshot(guard.db, snapshotInput, { actorId });

  if (!snapshot) {
    return NextResponse.json(
      { message: "snapshot already exists for this month. please retry." },
      { status: 409 },
    );
  }

  if (!duplicateKeyReturnedExisting) {
    await appendAudit(
      guard.db,
      {
        type: "revenue_report_snapshot_save",
        actorId: guard.admin._id,
        targetId: snapshot._id,
        message: "월별 매출 리포트 스냅샷 저장",
        diff: {
          yyyymm: snapshot.yyyymm,
          status: snapshot.status,
          memo: snapshot.memo ?? null,
          source: snapshot.source ?? null,
          meta: snapshot.meta ?? null,
          snapshotId: String(snapshot._id),
          previousUpdatedAt,
          totals: snapshotTotals(snapshotInput.report),
        },
      },
      req,
    );
  }

  return NextResponse.json({ item: serializeSnapshot(snapshot) });
}
