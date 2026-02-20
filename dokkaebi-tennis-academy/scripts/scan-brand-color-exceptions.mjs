#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const BRAND_EXCEPTION_WHITELIST = new Set([
  'app/login/_components/SocialAuthButtons.tsx',
  'app/login/_components/LoginPageClient.tsx',
  'app/admin/users/_components/UsersClient.tsx',
]);

const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{3,8}\b/g;
const RAW_PALETTE_REGEX = /(?:[\w-]+:)*(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?/g;

function walk(dir, result = []) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) return result;

  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;

    const absPath = path.join(absDir, entry.name);
    const relPath = path.relative(ROOT, absPath).replaceAll('\\', '/');

    if (entry.isDirectory()) {
      walk(relPath, result);
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name))) {
      result.push(relPath);
    }
  }

  return result;
}

function getLine(text, index) {
  return text.slice(0, index).split('\n').length;
}

const files = TARGET_DIRS.flatMap((dir) => walk(dir));
const violations = [];

for (const file of files) {
  if (BRAND_EXCEPTION_WHITELIST.has(file)) continue;

  const abs = path.join(ROOT, file);
  const content = fs.readFileSync(abs, 'utf8');
  const found = [];

  for (const match of content.matchAll(HEX_COLOR_REGEX)) {
    found.push({ type: 'hex', token: match[0], line: getLine(content, match.index ?? 0) });
  }

  for (const match of content.matchAll(RAW_PALETTE_REGEX)) {
    found.push({ type: 'raw-palette', token: match[0], line: getLine(content, match.index ?? 0) });
  }

  if (found.length > 0) {
    violations.push({ file, found });
  }
}

if (violations.length === 0) {
  console.log('✅ brand-color exception scan: whitelist 외 위반 없음');
  process.exit(0);
}

console.error('❌ brand-color exception scan: whitelist 외 파일에서 hex/raw palette가 발견되었습니다.');
console.warn(`- whitelist: ${[...BRAND_EXCEPTION_WHITELIST].join(', ')}`);
for (const entry of violations.sort((a, b) => a.file.localeCompare(b.file))) {
  console.warn(`\n- ${entry.file}`);
  for (const issue of entry.found.slice(0, 10)) {
    console.warn(`  - [${issue.type}] L${issue.line}: ${issue.token}`);
  }
  if (entry.found.length > 10) {
    console.warn(`  - ...and ${entry.found.length - 10} more`);
  }
}
console.error('\n(차단 스캔: whitelist 외 raw 색상은 CI를 실패시킵니다)');
process.exit(1);
