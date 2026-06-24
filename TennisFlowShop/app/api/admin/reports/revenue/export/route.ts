import { NextResponse } from "next/server";
import { buildRevenueReport, parseReportDate } from "../_lib/buildRevenueReport";
import { buildRevenueReportCsv, safeRevenueReportFilenameDate } from "../_lib/revenueReportCsv";
import { requireAdmin } from "@/lib/admin.guard";
import type { RevenueReportGroupBy } from "@/types/admin/reports";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const groupByParam = url.searchParams.get("groupBy");

  if (!from || !to || !parseReportDate(from, "from") || !parseReportDate(to, "to")) {
    return NextResponse.json({ message: "invalid date filter" }, { status: 400 });
  }
  if (groupByParam && groupByParam !== "day" && groupByParam !== "month") {
    return NextResponse.json({ message: "invalid groupBy" }, { status: 400 });
  }

  const groupBy: RevenueReportGroupBy = groupByParam === "month" ? "month" : "day";
  const report = await buildRevenueReport(guard.db, { from, to, groupBy });
  if (!report) return NextResponse.json({ message: "invalid date range" }, { status: 400 });

  const filename = `revenue-report-${safeRevenueReportFilenameDate(report.range.from)}-${safeRevenueReportFilenameDate(report.range.to)}-${groupBy}.csv`;
  return new Response(buildRevenueReportCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
