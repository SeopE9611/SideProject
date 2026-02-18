import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('관리자 신고 상태 변경 API는 액션별 타겟 outcome 기록 계약을 유지한다', () => {
  const source = read('app/api/admin/community/reports/[id]/status/route.ts');

  assert.ok(source.includes("resolve: 'no_target_change'"));
  assert.ok(source.includes("reject: 'no_target_change'"));
  assert.ok(source.includes("resolve_hide_target: 'updated'"));
  assert.ok(source.includes('const targetOutcome = TARGET_OUTCOME_BY_ACTION[action];'));
  assert.ok(!source.includes("const targetOutcome = hideTargetResult?.ok ? 'updated' : 'updated';"));
  assert.ok(source.includes("action === 'resolve_hide_target' && hideTargetResult?.ok"));
});

test('신고 타입은 실제 moderationAudit target outcome 정책과 일치한다', () => {
  const source = read('lib/types/community-report.ts');

  assert.ok(source.includes("export type CommunityReportModerationTargetOutcome = 'updated' | 'no_target_change';"));
  assert.ok(!source.includes("outcome: 'updated' | 'already_processed' | 'not_found';"));
  assert.ok(source.includes('outcome: CommunityReportModerationTargetOutcome;'));
});
