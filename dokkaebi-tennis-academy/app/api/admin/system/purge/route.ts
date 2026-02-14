import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  try {
    const db = guard.db;
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const result = await db.collection('users').deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    return NextResponse.json({
      message: '삭제 완료',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_PURGE_DELETE]', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
