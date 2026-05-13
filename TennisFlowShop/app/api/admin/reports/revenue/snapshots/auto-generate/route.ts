import { NextResponse } from "next/server";
import { z } from "zod";
import { getKstPreviousMonthYyyymm } from "@/lib/date/kst";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import {
  buildMonthlyRevenueReportSnapshot,
  REVENUE_REPORT_SNAPSHOT_STATUSES,
  REVENUE_REPORT_YYYY_MM_RE,
  saveRevenueReportSnapshot,
  serializeSnapshot,
  snapshotTotals,
} from "../../_lib/revenueReportSnapshots";

const autoGenerateSchema = z.object({
  yyyymm: z.string().regex(REVENUE_REPORT_YYYY_MM_RE, "invalid yyyymm").optional(),
  target: z.literal("previous-month").optional(),
  status: z.enum(REVENUE_REPORT_SNAPSHOT_STATUSES).optional().default("finalized"),
  memo: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const body = await req.json().catch(() => null);
  const parsed = autoGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "invalid auto-generate input" }, { status: 400 });
  }
  if (Boolean(parsed.data.yyyymm) === Boolean(parsed.data.target)) {
    return NextResponse.json({ message: "yyyymm or target is required" }, { status: 400 });
  }

  const yyyymm = parsed.data.target === "previous-month"
    ? getKstPreviousMonthYyyymm()
    : parsed.data.yyyymm;
  if (!yyyymm || !REVENUE_REPORT_YYYY_MM_RE.test(yyyymm)) {
    return NextResponse.json({ message: "invalid yyyymm" }, { status: 400 });
  }

  const now = new Date();
  const actorId = guard.admin._id.toHexString();
  const trigger = parsed.data.target === "previous-month" ? "previous_month" : "admin_manual_auto_generate";
  const snapshotInput = await buildMonthlyRevenueReportSnapshot(guard.db, {
    yyyymm,
    status: parsed.data.status,
    memo: parsed.data.memo,
    source: "auto",
    meta: {
      source: "auto_generate",
      generatedAt: now.toISOString(),
      generatedBy: actorId,
      trigger,
    },
  });
  if (!snapshotInput) return NextResponse.json({ message: "failed to build revenue report" }, { status: 500 });

  const { snapshot, previousUpdatedAt, duplicateKeyReturnedExisting } = await saveRevenueReportSnapshot(
    guard.db,
    snapshotInput,
    { actorId },
  );

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
        type: "revenue_report_snapshot_auto_generate",
        actorId: guard.admin._id,
        targetId: snapshot._id,
        message: "월별 매출 리포트 스냅샷 자동 생성/마감",
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
