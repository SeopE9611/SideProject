import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { handleUpdateShippingInfo } from '@/app/features/stringing-applications/api/handlers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const resolvedParams = await params;
  if (!ObjectId.isValid(resolvedParams.id)) {
    return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
  }

  const res = await handleUpdateShippingInfo(req, { params: resolvedParams });

  if (res.ok) {
    await appendAdminAudit(
      guard.db,
      {
        type: 'admin.applications.stringing.shipping.patch',
        actorId: guard.admin._id,
        targetId: new ObjectId(resolvedParams.id),
        message: '스트링잉 신청 배송정보 수정',
      },
      req,
    );
  }

  return res;
}
