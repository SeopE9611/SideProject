// 스냅샷 일괄 삭제 API
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function POST(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allow = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (origin && !origin.startsWith(allow)) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  try {
    const db = await getDb();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;

    if (!payload?.sub || payload.role !== 'admin') {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    const body = await req.json();
    let { yyyymms } = body;

    if (!Array.isArray(yyyymms) || yyyymms.length === 0) {
      return NextResponse.json({ success: false, message: '삭제할 항목을 선택하세요.' }, { status: 400 });
    }

    yyyymms = Array.from(new Set(yyyymms.filter((v: string) => /^\d{6}$/.test(v))));

    if (yyyymms.length === 0) {
      return NextResponse.json({ success: false, message: '유효한 YYYYMM이 없습니다.' }, { status: 400 });
    }

    const result = await db.collection('settlements').deleteMany({ yyyymm: { $in: yyyymms } });

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
