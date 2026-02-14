import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseline = JSON.parse(readFileSync(new URL('./admin-any-baseline.json', import.meta.url), 'utf8'));
const report = JSON.parse(execSync('node scripts/report-admin-any-count.mjs', { encoding: 'utf8' }));

const STRICT_P0_FILES = [
  'app/api/admin/dashboard/metrics/_core/getDashboardMetrics.ts',
  'app/api/admin/operations/route.ts',
];

const errors = [];
if (report.totals.all > baseline.totals.all) {
  errors.push(`admin any 총계 증가: baseline=${baseline.totals.all}, current=${report.totals.all}`);
}
if (report.totals.p0Critical > baseline.totals.p0Critical) {
  errors.push(`P0(admin 결제/정산/상태변경) any 증가: baseline=${baseline.totals.p0Critical}, current=${report.totals.p0Critical}`);
}

for (const file of STRICT_P0_FILES) {
  const hit = report.byFile.find((row) => row.file === file);
  if (hit && hit.count > 0) {
    errors.push(`핵심 API any 금지 위반: ${file} (count=${hit.count})`);
  }
}

if (errors.length > 0) {
  console.error('[admin-any-gate] FAIL');
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}

console.log('[admin-any-gate] PASS');
console.log(JSON.stringify({
  baseline: baseline.totals,
  current: report.totals,
}, null, 2));
