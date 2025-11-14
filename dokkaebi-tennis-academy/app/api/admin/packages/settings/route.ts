import { NextResponse } from 'next/server';
import { DEFAULT_GENERAL_SETTINGS, type GeneralSettings, type PackageConfig } from '@/lib/package-settings';
import { loadPackageSettings, savePackageSettings } from '@/app/features/packages/api/db';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  // 현재 다른 admin 라우터와 동일하게 일단 통과만 시킴
  return true;
}

export async function GET() {
  await requireAdmin();

  try {
    const { packageConfigs, generalSettings } = await loadPackageSettings();
    return NextResponse.json({ packageConfigs, generalSettings });
  } catch (e) {
    console.error('[GET /api/admin/packages/settings] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  await requireAdmin();

  try {
    const body = await req.json();

    const rawPackages: PackageConfig[] = Array.isArray(body.packageConfigs) ? body.packageConfigs : [];

    const rawGeneral: Partial<GeneralSettings> = body.generalSettings ?? {};

    // 1) 패키지 설정 정규화 + 가벼운 검증
    const packageConfigs: PackageConfig[] = rawPackages
      .map((pkg, index) => ({
        id: String(pkg.id || `package-${pkg.sessions || index + 1}`),
        name: String(pkg.name || `${pkg.sessions}회권`),
        sessions: Number(pkg.sessions || 0),
        price: Number(pkg.price || 0),
        originalPrice: pkg.originalPrice != null ? Number(pkg.originalPrice) : undefined,
        description: String(pkg.description ?? ''),
        features: Array.isArray(pkg.features) ? pkg.features.map((f) => String(f)) : [],
        isActive: !!pkg.isActive,
        isPopular: !!pkg.isPopular,
        validityDays: Number(pkg.validityDays || 0),
        sortOrder: typeof pkg.sortOrder === 'number' ? pkg.sortOrder : index + 1,
      }))
      // 회수/가격이 0인 이상한 항목은 버림
      .filter((pkg) => pkg.sessions > 0 && pkg.price > 0);

    // 2) 일반 설정 병합
    const generalSettings: GeneralSettings = {
      ...DEFAULT_GENERAL_SETTINGS,
      enablePackages: !!rawGeneral.enablePackages,
      maxValidityDays: Number(rawGeneral.maxValidityDays ?? DEFAULT_GENERAL_SETTINGS.maxValidityDays),
      minSessions: Number(rawGeneral.minSessions ?? DEFAULT_GENERAL_SETTINGS.minSessions),
      maxSessions: Number(rawGeneral.maxSessions ?? DEFAULT_GENERAL_SETTINGS.maxSessions),
      defaultServiceType: rawGeneral.defaultServiceType === '출장' ? '출장' : '방문',
      autoExpireNotificationDays: Number(rawGeneral.autoExpireNotificationDays ?? DEFAULT_GENERAL_SETTINGS.autoExpireNotificationDays),
      allowExtension: !!rawGeneral.allowExtension,
      extensionFeePercentage: Number(rawGeneral.extensionFeePercentage ?? DEFAULT_GENERAL_SETTINGS.extensionFeePercentage),
    };

    await savePackageSettings({ packageConfigs, generalSettings });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/admin/packages/settings] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
