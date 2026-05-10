import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";
import { buildOfflineRevenueSummary, parseOfflineSummaryDateBoundary } from "@/app/api/admin/offline/_lib/revenueSummary";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const groupByParam = url.searchParams.get("groupBy");
  const includePackageSales = url.searchParams.get("includePackageSales") !== "false";

  const from = parseOfflineSummaryDateBoundary(fromParam, "from");
  const to = parseOfflineSummaryDateBoundary(toParam, "to");
  if ((fromParam && !from) || (toParam && !to)) {
    return NextResponse.json({ message: "invalid date filter" }, { status: 400 });
  }
  if (from && to && from > to) {
    return NextResponse.json({ message: "invalid date range" }, { status: 400 });
  }
  if (groupByParam && groupByParam !== "day" && groupByParam !== "month") {
    return NextResponse.json({ message: "invalid groupBy" }, { status: 400 });
  }

  const summary = await buildOfflineRevenueSummary(guard.db, {
    from,
    to,
    groupBy: groupByParam === "day" || groupByParam === "month" ? groupByParam : null,
    includePackageSales,
  });

  return NextResponse.json(summary);
}
