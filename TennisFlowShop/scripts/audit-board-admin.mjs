#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const checks = [
  {
    name: '관리자 API 경계 점검',
    cmd: 'npm',
    args: ['run', 'check:admin-api-boundary'],
  },
  {
    name: '관리자 any 기술부채 게이트',
    cmd: 'npm',
    args: ['run', 'check:admin-any-gate'],
  },
  {
    name: '게시판 비밀글 정책 테스트',
    cmd: 'npm',
    args: ['run', 'test:board-secret-policy'],
  },
  {
    name: '커뮤니티/관리자 계약 테스트',
    cmd: 'npm',
    args: ['run', 'test:contract'],
  },
];

const results = [];

for (const check of checks) {
  console.log(`\n▶ ${check.name}`);
  const run = spawnSync(check.cmd, check.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  const ok = (run.status ?? 1) === 0;
  results.push({ ...check, ok, code: run.status ?? 1 });

  if (!ok) {
    console.error(`\n✖ 실패: ${check.name} (exit=${run.status ?? 1})`);
    break;
  }
}

console.log('\n===== Board/Admin Audit Summary =====');
for (const result of results) {
  console.log(`${result.ok ? '✅' : '❌'} ${result.name}`);
}

const failed = results.find((item) => !item.ok);
if (failed) {
  process.exit(failed.code || 1);
}

console.log('✅ 모든 게시판/관리자 핵심 정적·계약 점검을 통과했습니다.');
