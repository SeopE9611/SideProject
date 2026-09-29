import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { syncNicePaymentByOrderId as handleNicePaymentSyncByOrderId } from "@/lib/payments/nice/syncOrder";

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { orderId } = await params;
  return handleNicePaymentSyncByOrderId(orderId);
}
