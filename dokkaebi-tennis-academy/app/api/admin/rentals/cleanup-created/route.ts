import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';

// 운영 정책상 이 엔드포인트는 비활성화 상태를 유지한다.
export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  return NextResponse.json({ ok: false, error: 'deprecated_endpoint', message: 'cleanup-created 엔드포인트는 비활성화되었습니다.' }, { status: 410 });
}
