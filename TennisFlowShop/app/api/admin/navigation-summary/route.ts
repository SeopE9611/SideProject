import { NextResponse } from "next/server";

import { countAdminNavigationSummary } from "@/app/api/admin/_lib/adminOperationCounts";
import { requireAdmin } from "@/lib/admin.guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { db } = guard;
  const { counts, operationTaskCounts } = await countAdminNavigationSummary(db);

  return NextResponse.json({ counts, operationTaskCounts });
}
