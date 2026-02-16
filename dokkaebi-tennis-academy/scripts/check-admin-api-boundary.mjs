#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'app', 'admin');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const API_PATTERN = /['"`]\/api\/(?!admin\b)/g;
const MUTATION_EXPORT_PATTERN = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\s*\(/g;

/**
 * 관리자 변경성 엔드포인트가 비-admin 네임스페이스에 남아있더라도
 * 전환 단계에서는 307/410 정책 래퍼만 허용한다.
 */
const LEGACY_ADMIN_MUTATION_ROUTES = [
  'app/api/package-orders/[id]/route.ts',
  'app/api/package-orders/[id]/extend/route.ts',
  'app/api/package-orders/[id]/adjust-sessions/route.ts',
];

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

try {
  if (!fs.existsSync(TARGET_DIR)) {
    console.log('✅ app/admin 디렉터리가 없어 검사할 항목이 없습니다.');
    process.exit(0);
  }

  const files = walk(TARGET_DIR);
  const allViolations = files.flatMap(findViolations);
  const legacyMutationViolations = findLegacyMutationViolations();

  if (allViolations.length === 0 && legacyMutationViolations.length === 0) {
    console.log('✅ app/admin 비-admin API 호출이 없고, 관리자 변경성 비-admin 경로 잔존도 없습니다.');
    process.exit(0);
  }

  if (allViolations.length > 0) {
    console.error('❌ app/admin 내 비-admin API 호출이 감지되었습니다.');
  }
  for (const v of allViolations) {
    console.error(`${v.file}:${v.line}: ${v.text}`);
  }

  if (legacyMutationViolations.length > 0) {
    console.error('❌ 관리자 변경성 엔드포인트의 비-admin 경로 잔존이 감지되었습니다.');
  }
  for (const v of legacyMutationViolations) {
    console.error(`${v.file}: ${v.reason}`);
  }

  process.exit(1);
} catch (error) {
  console.error('❌ 관리자 API 경계 검사 스크립트 실행 실패');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
