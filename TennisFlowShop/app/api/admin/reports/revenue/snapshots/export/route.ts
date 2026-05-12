import { NextResponse } from "next/server";
import { buildRevenueReportSnapshotCsv } from "../../_lib/revenueReportCsv";
import { requireAdmin } from "@/lib/admin.guard";
import type { RevenueReportResponse, RevenueReportSnapshotStatus } from "@/types/admin/reports";

const COLLECTION = "revenue_report_snapshots";
const YYYY_MM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type RevenueReportSnapshotExportDoc = {
  yyyymm: string;
  report?: RevenueReportResponse | null;
  status: RevenueReportSnapshotStatus;
  memo?: string | null;
  updatedAt?: Date | string | null;
};

function serializeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isRevenueReportResponse(value: unknown): value is RevenueReportResponse {
  if (!isRecord(value)) return false;
  const { range, online, offline, combinedPreview, series } = value;
  return (
    isRecord(range) &&
    typeof range.from === "string" &&
    typeof range.to === "string" &&
    (range.groupBy === "day" || range.groupBy === "month") &&
    isRecord(online) &&
    isRecord(online.bySource) &&
    isRecord(offline) &&
    isRecord(offline.byMethod) &&
    isRecord(combinedPreview) &&
    Array.isArray(series)
  );
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const yyyymm = url.searchParams.get("yyyymm")?.trim() ?? "";
  if (!YYYY_MM_RE.test(yyyymm)) {
    return NextResponse.json({ message: "invalid yyyymm" }, { status: 400 });
  }

  const snapshot = await guard.db.collection<RevenueReportSnapshotExportDoc>(COLLECTION).findOne({ yyyymm });
  if (!snapshot) {
    return NextResponse.json({ message: "snapshot not found" }, { status: 404 });
  }
  if (!isRevenueReportResponse(snapshot.report)) {
    return NextResponse.json({ message: "invalid snapshot report" }, { status: 400 });
  }

  return new Response(
    buildRevenueReportSnapshotCsv(snapshot.report, {
      yyyymm: snapshot.yyyymm,
      status: snapshot.status,
      savedAt: serializeDate(snapshot.updatedAt),
      memo: snapshot.memo ?? null,
    }),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="revenue-report-snapshot-${yyyymm}.csv"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
