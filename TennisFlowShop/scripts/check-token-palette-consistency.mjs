#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const TOKEN_DEFINITION_ALLOWLIST = new Set(['app/globals.css']);
const BRAND_EXCEPTION_WHITELIST = new Set([
  'app/login/_components/SocialAuthButtons.tsx',
  'app/login/_components/LoginPageClient.tsx',
  'app/admin/users/_components/UsersClient.tsx',
]);
const BASELINE_PATH = path.join(ROOT, 'scripts/token-palette-blue-baseline.json');

const PRIMARY_BACKGROUND_REDEFINE = /--(?:primary|background)\s*:/g;
const BLUE_REGRESSION = /#3b82f6\b|#60a5fa\b|#2563eb\b|#1d4ed8\b|(?:[\w-]+:)*(?:bg|text|border|ring|from|to|via)-blue-\d{2,3}(?:\/\d{1,3})?/g;

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
const redefineViolations = [];
const blueFindings = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');

  if (!TOKEN_DEFINITION_ALLOWLIST.has(file)) {
    for (const match of content.matchAll(PRIMARY_BACKGROUND_REDEFINE)) {
      redefineViolations.push({
        file,
        line: getLine(content, match.index ?? 0),
        token: match[0],
      });
    }
  }

  if (!BRAND_EXCEPTION_WHITELIST.has(file)) {
    for (const match of content.matchAll(BLUE_REGRESSION)) {
      blueFindings.push({
        file,
        line: getLine(content, match.index ?? 0),
        token: match[0],
      });
    }
  }
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const baselineSet = new Set(baseline.blueFindings);
const currentSignatures = blueFindings.map((issue) => `${issue.file}:${issue.line}:${issue.token}`);
const newBlueRegressions = currentSignatures.filter((sig) => !baselineSet.has(sig));

if (redefineViolations.length === 0 && newBlueRegressions.length === 0) {
  console.log('✅ token palette consistency check: 위반 없음');
  process.exit(0);
}

console.error('❌ token palette consistency check: 토큰 규칙 위반 발견');
for (const issue of redefineViolations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))) {
  console.error(`- [token-redefine] ${issue.file}:${issue.line} -> ${issue.token}`);
}
for (const sig of newBlueRegressions.sort()) {
  console.error(`- [new-blue-regression] ${sig}`);
}
process.exit(1);
