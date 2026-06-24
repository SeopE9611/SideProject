import { NextResponse } from "next/server";
import { buildRevenueReport } from "./_lib/buildRevenueReport";
import { requireAdmin } from "@/lib/admin.guard";
import type { RevenueReportGroupBy } from "@/types/admin/reports";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const groupByParam = url.searchParams.get("groupBy");
  if (groupByParam && groupByParam !== "day" && groupByParam !== "month") {
    return NextResponse.json({ message: "invalid groupBy" }, { status: 400 });
  }

  const groupBy: RevenueReportGroupBy = groupByParam === "month" ? "month" : "day";
  const response = await buildRevenueReport(guard.db, {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    groupBy,
  });

  if (!response) return NextResponse.json({ message: "invalid date filter" }, { status: 400 });
  return NextResponse.json(response);
}
