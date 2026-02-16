// 스냅샷 일괄 삭제 API
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';

export async function POST(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allow = process.env.NEXT_PUBLIC_SITE_URL;
  if (allow && origin && !origin.startsWith(allow)) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  try {
    // 관리자 인증(정산 스냅샷 삭제는 민감 작업이므로 관리자만 허용)
    const g = await requireAdmin(req);
    if (!g.ok) return g.res;
    const db = g.db;

    // Body 파싱 (깨진 JSON 대비)
    const body = await req.json().catch(() => null);
    const raw = body?.yyyymms;

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ success: false, message: '삭제할 항목을 선택하세요.' }, { status: 400 });
    }

    // 문자열로 정규화 + YYYYMM만 허용 + 중복 제거
    const yyyymms = Array.from(new Set(raw.map((v: unknown) => String(v ?? '').trim()).filter((v: string) => /^\d{6}$/.test(v))));
    if (yyyymms.length === 0) {
      return NextResponse.json({ success: false, message: '유효한 YYYYMM이 없습니다.' }, { status: 400 });
    }

    const result = await db.collection('settlements').deleteMany({ yyyymm: { $in: yyyymms } });

    await appendAdminAudit(
      db,
      {
        type: 'admin.settlements.bulk-delete',
        actorId: g.admin._id,
        message: '정산 스냅샷 일괄 삭제',
        diff: { yyyymms, deletedCount: result.deletedCount },
      },
      req,
    );

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount}개의 스냅샷이 삭제되었습니다.`,
      deletedCount: result.deletedCount,
    });
  } catch (e) {
    console.error('[settlements/bulk-delete]', e);
    return NextResponse.json({ message: 'internal_error' }, { status: 500 });
  }
}
