import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { handleOfflineRecordPoints } from "@/lib/offline/record-points";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { id } = await ctx.params;
  return handleOfflineRecordPoints(req, guard.db, guard.admin, id, "deduct");
}
