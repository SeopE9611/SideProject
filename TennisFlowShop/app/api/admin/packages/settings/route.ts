import { NextResponse } from "next/server";
import {
  DEFAULT_GENERAL_SETTINGS,
  type GeneralSettings,
  type PackageConfig,
} from "@/lib/package-settings";
import {
  loadPackageSettings,
  savePackageSettings,
} from "@/app/features/packages/api/db";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

export const dynamic = "force-dynamic";

function toNumberSafe(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function summarizePackageSettings(packageConfigs: PackageConfig[]) {
  return {
    packageCount: packageConfigs.length,
    activePackageCount: packageConfigs.filter((pkg) => pkg.isActive).length,
    packageIds: packageConfigs.map((pkg) => pkg.id).slice(0, 20),
  };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  try {
    const { packageConfigs, generalSettings } = await loadPackageSettings();
    return NextResponse.json({ packageConfigs, generalSettings });
  } catch (e) {
    console.error("[GET /api/admin/packages/settings] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // 잘못된 JSON은 500이 아니라 400으로 정리
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[PUT /api/admin/packages/settings] invalid json", e);
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const rawPackages: PackageConfig[] = Array.isArray(body.packageConfigs)
      ? body.packageConfigs
      : [];

    const rawGeneral: Partial<GeneralSettings> = body.generalSettings ?? {};

    // 1) 패키지 설정 정규화 + 가벼운 검증
    const packageConfigs: PackageConfig[] = rawPackages
      .map((pkg, index) => ({
        id: String(pkg.id || `package-${pkg.sessions || index + 1}`),
        name: String(pkg.name || `${pkg.sessions}회권`),
        sessions: toNumberSafe(pkg.sessions, 0),
        price: toNumberSafe(pkg.price, 0),
        originalPrice:
          pkg.originalPrice != null &&
          Number.isFinite(Number(pkg.originalPrice))
            ? Number(pkg.originalPrice)
            : undefined,
        description: String(pkg.description ?? ""),
        features: Array.isArray(pkg.features)
          ? pkg.features.map((f) => String(f))
          : [],
        isActive: !!pkg.isActive,
        isPopular: !!pkg.isPopular,
        validityDays: toNumberSafe(pkg.validityDays, 0),
        sortOrder:
          typeof pkg.sortOrder === "number" ? pkg.sortOrder : index + 1,
      }))
      // 회수/가격이 0인 이상한 항목은 버림
      .filter((pkg) => pkg.sessions > 0 && pkg.price > 0);

    // 2) 일반 설정 병합
    const generalSettings: GeneralSettings = {
      ...DEFAULT_GENERAL_SETTINGS,
      enablePackages: !!rawGeneral.enablePackages,
      maxValidityDays: toNumberSafe(
        rawGeneral.maxValidityDays,
        DEFAULT_GENERAL_SETTINGS.maxValidityDays,
      ),
      minSessions: toNumberSafe(
        rawGeneral.minSessions,
        DEFAULT_GENERAL_SETTINGS.minSessions,
      ),
      maxSessions: toNumberSafe(
        rawGeneral.maxSessions,
        DEFAULT_GENERAL_SETTINGS.maxSessions,
      ),
      defaultServiceType: "방문",
      autoExpireNotificationDays: toNumberSafe(
        rawGeneral.autoExpireNotificationDays,
        DEFAULT_GENERAL_SETTINGS.autoExpireNotificationDays,
      ),
      allowExtension: !!rawGeneral.allowExtension,
      extensionFeePercentage: toNumberSafe(
        rawGeneral.extensionFeePercentage,
        DEFAULT_GENERAL_SETTINGS.extensionFeePercentage,
      ),
    };

    const beforeSettings = await loadPackageSettings();
    await savePackageSettings({ packageConfigs, generalSettings });

    const beforeSummary = summarizePackageSettings(beforeSettings.packageConfigs);
    const afterSummary = summarizePackageSettings(packageConfigs);
    const beforeById = new Map(
      beforeSettings.packageConfigs.map((pkg) => [pkg.id, pkg]),
    );
    const afterById = new Map(packageConfigs.map((pkg) => [pkg.id, pkg]));
    const addedCount = packageConfigs.filter((pkg) => !beforeById.has(pkg.id)).length;
    const removedCount = beforeSettings.packageConfigs.filter(
      (pkg) => !afterById.has(pkg.id),
    ).length;
    const updatedCount = packageConfigs.filter((pkg) => {
      const before = beforeById.get(pkg.id);
      return before && JSON.stringify(before) !== JSON.stringify(pkg);
    }).length;
    const priceChangedCount = packageConfigs.filter((pkg) => {
      const before = beforeById.get(pkg.id);
      return before ? before.price !== pkg.price : false;
    }).length;
    await appendAdminAudit(
      guard.db,
      {
        type: "package.settings.update",
        actorId: guard.admin._id,
        message: "관리자 패키지 설정 변경",
        diff: {
          targetType: "packageSettings",
          targetScope: "packages.settings",
          before: beforeSummary,
          after: afterSummary,
          metadata: {
            changedKeys: ["packageConfigs", "generalSettings"],
            addedCount,
            removedCount,
            updatedCount,
            priceChangedCount,
          },
        },
      },
      req,
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PUT /api/admin/packages/settings] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
