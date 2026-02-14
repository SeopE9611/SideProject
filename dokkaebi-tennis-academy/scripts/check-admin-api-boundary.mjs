#!/usr/bin/env node
import { execSync } from 'node:child_process';

const cmd = String.raw`rg -n "['\"\"]/api/(?!admin)" app/admin -P`;

try {
  const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).trim();
  if (!out) {
    console.log('✅ app/admin 비-admin API 호출이 없습니다.');
    process.exit(0);
  }

  console.error('❌ app/admin 내 비-admin API 호출이 감지되었습니다.');
  console.error(out);
  process.exit(1);
} catch (error) {
  const stdout = error?.stdout?.toString?.() ?? '';
  const stderr = error?.stderr?.toString?.() ?? '';
  const combined = `${stdout}${stderr}`.trim();

  // rg exit code 1: no matches (정상)
  if (typeof error?.status === 'number' && error.status === 1) {
    console.log('✅ app/admin 비-admin API 호출이 없습니다.');
    process.exit(0);
  }

  console.error('❌ 관리자 API 경계 검사 스크립트 실행 실패');
  if (combined) console.error(combined);
  process.exit(1);
}
