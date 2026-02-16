import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { enforceAdminRateLimit } from '@/lib/admin/adminRateLimit';
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from '@/lib/admin/adminEndpointCostPolicy';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const limited = await enforceAdminRateLimit(req, guard.db, String(guard.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminSystemPreview);
  if (limited) return limited;

  try {
    const db = guard.db;
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const users = await db
      .collection('users')
      .find({ isDeleted: true, deletedAt: { $lt: cutoff } })
      .project({ hashedPassword: 0, password: 0 })
      .toArray();

    return NextResponse.json({ candidates: users });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_PURGE_PREVIEW]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
