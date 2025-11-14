import { NextResponse } from 'next/server';
import { loadPackageSettings } from '@/app/features/packages/api/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { packageConfigs } = await loadPackageSettings();

    // 사용자에게는 활성 + 정렬된 패키지만 노출
    const activePackages = packageConfigs.filter((pkg) => pkg.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

    return NextResponse.json({ packages: activePackages });
  } catch (e) {
    console.error('[GET /api/packages/settings] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
