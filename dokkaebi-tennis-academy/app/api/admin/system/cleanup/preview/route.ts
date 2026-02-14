import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  try {
    const db = guard.db;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await db
      .collection('users')
      .find({
        isDeleted: true,
        deletedAt: { $lt: cutoff },
      })
      .project({ hashedPassword: 0, password: 0 })
      .toArray();

    return NextResponse.json({ candidates: users });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_CLEANUP_PREVIEW]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
