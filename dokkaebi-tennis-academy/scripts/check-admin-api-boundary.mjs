#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'app', 'admin');
const LEGACY_API_DIR = path.join(ROOT, 'app', 'api', 'package-orders');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const API_PATTERN = /['"`]\/api\/(?!admin\b)/g;
const MUTATION_EXPORT_PATTERN = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\s*\(/g;

const ADMIN_DIRECT_FETCH_ALLOWLIST = new Set([
  'app/admin/applications/stringing/[id]/shipping-update/shipping-form.tsx',
  'app/admin/boards/BoardsClient.tsx',
  'app/admin/notifications/_components/AdminNotificationsClient.tsx',
  'app/admin/orders/[id]/shipping-update/page.tsx',
  'app/admin/orders/[id]/shipping-update/shipping-form.tsx',
  'app/admin/packages/[id]/PackageDetailClient.tsx',
  'app/admin/products/ProductsClient.tsx',
  'app/admin/products/[id]/edit/ProductEditClient_view.tsx',
  'app/admin/rackets/[id]/edit/_components/AdminRacketEditClient.tsx',
  'app/admin/rentals/[id]/_components/AdminRentalDetailClient.tsx',
  'app/admin/rentals/[id]/shipping-update/shipping-form.tsx',
  'app/admin/rentals/_components/AdminRentalsClient.tsx',
  'app/admin/rentals/_components/CleanupCreatedButton.tsx',
  'app/admin/reviews/_components/AdminReviewListClient.tsx',
  'app/admin/settlements/_components/SettlementsClient_view.tsx',
  'app/admin/users/_components/UserDetailClient.tsx',
]);

/**
 * 관리자 변경성 엔드포인트가 비-admin 네임스페이스에 남아있더라도
 * 전환 단계에서는 307/410 정책 래퍼만 허용한다.
 */
const LEGACY_ADMIN_MUTATION_ROUTES = [
  'app/api/package-orders/[id]/route.ts',
  'app/api/package-orders/[id]/extend/route.ts',
  'app/api/package-orders/[id]/adjust-sessions/route.ts',
  'app/api/package-orders/[id]/pass-status/route.ts',
];

const LEGACY_ALLOWED_WRAPPERS = new Map([
  ['app/api/package-orders/route.ts', new Set(['GET'])],
  ['app/api/package-orders/[id]/route.ts', new Set(['GET', 'PATCH'])],
  ['app/api/package-orders/[id]/extend/route.ts', new Set(['POST'])],
  ['app/api/package-orders/[id]/adjust-sessions/route.ts', new Set(['POST'])],
  ['app/api/package-orders/[id]/pass-status/route.ts', new Set(['POST'])],
]);

function isDeprecationWrapper(source) {
  return source.includes('NextResponse.redirect(') && (source.includes('307') || source.includes('410'));
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      files.push(...walk(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) continue;

    files.push(fullPath);
  }

  return files;
}

function findViolations(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    API_PATTERN.lastIndex = 0;
    if (!API_PATTERN.test(line)) continue;

    violations.push({
      file: path.relative(ROOT, filePath),
      line: i + 1,
      text: line.trim(),
    });
  }

  return violations;
}


function findAdminDirectFetchViolations(filePath) {
  const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (ADMIN_DIRECT_FETCH_ALLOWLIST.has(relativePath)) return [];

  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const normalized = line.replace(/\s+/g, ' ');
    if (!normalized.includes('fetch(') || !normalized.includes('/api/admin')) continue;

    violations.push({
      file: relativePath,
      line: i + 1,
      text: line.trim(),
      reason: 'app/admin 에서는 직접 fetch("/api/admin/**") 대신 adminFetcher/adminMutator를 사용해야 합니다.',
    });
  }

  return violations;
}

function findLegacyMutationViolations() {
  const violations = [];

  for (const relativePath of LEGACY_ADMIN_MUTATION_ROUTES) {
    const fullPath = path.join(ROOT, relativePath);
    if (!fs.existsSync(fullPath)) continue;

    const source = fs.readFileSync(fullPath, 'utf8');
    MUTATION_EXPORT_PATTERN.lastIndex = 0;
    const hasMutationHandler = MUTATION_EXPORT_PATTERN.test(source);

    if (!hasMutationHandler) continue;
    if (isDeprecationWrapper(source)) continue;

    violations.push({
      file: relativePath,
      reason: '관리자 변경성 엔드포인트가 비-admin 경로에 구현 상태로 남아 있습니다. 307/410 정책 래퍼만 허용됩니다.',
    });
  }

  return violations;
}

function findLegacyWrapperBoundaryViolations() {
  if (!fs.existsSync(LEGACY_API_DIR)) return [];

  const files = walk(LEGACY_API_DIR);
  const violations = [];

  for (const fullPath of files) {
    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    const source = fs.readFileSync(fullPath, 'utf8');
    const exportedHandlers = [...source.matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)].map((m) => m[1]);
    const hasEndpointHandler = exportedHandlers.length > 0;

    if (!hasEndpointHandler) continue;

    const allowedHandlers = LEGACY_ALLOWED_WRAPPERS.get(relativePath);
    if (!allowedHandlers) {
      violations.push({
        file: relativePath,
        reason: '허용 목록에 없는 legacy 비-admin API 라우트입니다. 신규 구현 대신 307/410 이관 정책 문서화를 먼저 수행하세요.',
      });
      continue;
    }

    if (!isDeprecationWrapper(source)) {
      violations.push({
        file: relativePath,
        reason: 'legacy 비-admin 라우트는 307/410 이관 정책 래퍼여야 합니다.',
      });
      continue;
    }

    for (const method of exportedHandlers) {
      if (allowedHandlers.has(method)) continue;
      violations.push({
        file: relativePath,
        reason: `허용되지 않은 HTTP 메서드(${method})가 선언되어 있습니다. 허용 메서드: ${[...allowedHandlers].join(', ')}`,
      });
    }
  }

  return violations;
}

try {
  if (!fs.existsSync(TARGET_DIR)) {
    console.log('✅ app/admin 디렉터리가 없어 검사할 항목이 없습니다.');
    process.exit(0);
  }

  const files = walk(TARGET_DIR);
  const allViolations = files.flatMap(findViolations);
  const adminDirectFetchViolations = files.flatMap(findAdminDirectFetchViolations);
  const legacyMutationViolations = findLegacyMutationViolations();
  const legacyWrapperBoundaryViolations = findLegacyWrapperBoundaryViolations();

  if (allViolations.length === 0 && adminDirectFetchViolations.length === 0 && legacyMutationViolations.length === 0 && legacyWrapperBoundaryViolations.length === 0) {
    console.log('✅ app/admin 비-admin API 호출이 없고, 관리자 변경성 비-admin 경로 잔존도 없습니다.');
    process.exit(0);
  }

  if (allViolations.length > 0) {
    console.error('❌ app/admin 내 비-admin API 호출이 감지되었습니다.');
  }
  for (const v of allViolations) {
    console.error(`${v.file}:${v.line}: ${v.text}`);
  }

  if (adminDirectFetchViolations.length > 0) {
    console.error('❌ app/admin 내 직접 /api/admin fetch 호출이 감지되었습니다.');
  }
  for (const v of adminDirectFetchViolations) {
    console.error(`${v.file}:${v.line}: ${v.text}`);
  }

  if (legacyMutationViolations.length > 0) {
    console.error('❌ 관리자 변경성 엔드포인트의 비-admin 경로 잔존이 감지되었습니다.');
  }
  for (const v of legacyMutationViolations) {
    console.error(`${v.file}: ${v.reason}`);
  }

  if (legacyWrapperBoundaryViolations.length > 0) {
    console.error('❌ legacy 비-admin API 경계 정책 위반이 감지되었습니다.');
  }
  for (const v of legacyWrapperBoundaryViolations) {
    console.error(`${v.file}: ${v.reason}`);
  }

  process.exit(1);
} catch (error) {
  console.error('❌ 관리자 API 경계 검사 스크립트 실행 실패');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
