import { NextResponse } from "next/server";

import { countAdminNavigationSummary } from "@/app/api/admin/_lib/adminOperationCounts";
import { requireAdmin } from "@/lib/admin.guard";
import { createApiPerfLogger } from "@/lib/api/perf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const perf = createApiPerfLogger("GET /api/admin/navigation-summary");
  const guard = await perf.measure("authAndDb", () => requireAdmin(req));
  if (!guard.ok) return guard.res;

  const { db } = guard;
  const { counts, operationTaskCounts, operationGroupCounts, operationSignalCounts } =
    await perf.measure("query", () => countAdminNavigationSummary(db));

  const response = NextResponse.json({
    counts,
    operationTaskCounts,
    operationGroupCounts,
    operationSignalCounts,
  });
  perf.log();
  return response;
}
