import clientPromise from '@/lib/mongodb';
import { DEFAULT_GENERAL_SETTINGS, DEFAULT_PACKAGE_CONFIGS, type GeneralSettings, type PackageConfig } from '@/lib/package-settings';

interface PackageSettingsDoc {
  _id: string; // 항상 'settings' 같은 문자열 ID
  packageConfigs?: PackageConfig[];
  generalSettings?: Partial<GeneralSettings>;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'package_settings';
const DOCUMENT_ID = 'settings';

// DB에서 패키지 설정 읽기
export async function loadPackageSettings(): Promise<{
  packageConfigs: PackageConfig[];
  generalSettings: GeneralSettings;
}> {
  const client = await clientPromise;
  const db = client.db();

  //  _id가 string인 컬렉션으로 타입 지정
  const col = db.collection<PackageSettingsDoc>(COLLECTION_NAME);

  // 한 문서에 전체 설정을 저장하는 구조
  const doc = await col.findOne({ _id: DOCUMENT_ID });

  // 저장된 값이 없으면 기본값 사용 (현재 동작과 동일)
  const rawConfigs = Array.isArray(doc?.packageConfigs) && doc?.packageConfigs.length ? doc.packageConfigs : DEFAULT_PACKAGE_CONFIGS;

  const packageConfigs = normalizePackageConfigs(rawConfigs);

  const generalSettings: GeneralSettings = {
    ...DEFAULT_GENERAL_SETTINGS,
    ...(doc?.generalSettings ?? {}),
  };

  return { packageConfigs, generalSettings };
}

// 패키지 배열 정규화(정렬 순서/플래그 기본값 보정)
function normalizePackageConfigs(configs: PackageConfig[]): PackageConfig[] {
  return configs
    .map((pkg, index) => ({
      ...pkg,
      sortOrder: typeof pkg.sortOrder === 'number' ? pkg.sortOrder : index + 1,
      isActive: pkg.isActive ?? true,
      isPopular: pkg.isPopular ?? false,
      features: Array.isArray(pkg.features) ? pkg.features.map((f) => String(f)) : [],
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// 설정 저장 (관리자용)
export async function savePackageSettings(input: { packageConfigs: PackageConfig[]; generalSettings: GeneralSettings }) {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection<PackageSettingsDoc>(COLLECTION_NAME);
  const now = new Date();

  await col.updateOne(
    { _id: DOCUMENT_ID },
    {
      $set: {
        packageConfigs: normalizePackageConfigs(input.packageConfigs),
        generalSettings: input.generalSettings,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}

// 가격/세션 검증에 쓸 정보만 추출 (주문 API에서 사용 예정)
export async function getPackagePricingInfo(): Promise<{
  allowedSessions: Set<number>;
  priceBySessions: Record<number, number>;
  configById: Record<string, PackageConfig>;
}> {
  const { packageConfigs } = await loadPackageSettings();

  const active = packageConfigs.filter((p) => p.isActive);

  const allowedSessions = new Set<number>();
  const priceBySessions: Record<number, number> = {};
  const configById: Record<string, PackageConfig> = {};

  for (const pkg of packageConfigs) {
    configById[pkg.id] = pkg;
  }

  for (const pkg of active) {
    allowedSessions.add(pkg.sessions);
    priceBySessions[pkg.sessions] = pkg.price;
  }

  return { allowedSessions, priceBySessions, configById };
}
