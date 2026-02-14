#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'app', 'admin');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const API_PATTERN = /['"`]\/api\/(?!admin\b)/g;

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

try {
  if (!fs.existsSync(TARGET_DIR)) {
    console.log('✅ app/admin 디렉터리가 없어 검사할 항목이 없습니다.');
    process.exit(0);
  }

  const files = walk(TARGET_DIR);
  const allViolations = files.flatMap(findViolations);

  if (allViolations.length === 0) {
    console.log('✅ app/admin 비-admin API 호출이 없습니다.');
    process.exit(0);
  }

  console.error('❌ app/admin 내 비-admin API 호출이 감지되었습니다.');
  for (const v of allViolations) {
    console.error(`${v.file}:${v.line}: ${v.text}`);
  }
  process.exit(1);
} catch (error) {
  console.error('❌ 관리자 API 경계 검사 스크립트 실행 실패');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
