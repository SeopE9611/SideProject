import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readRoute(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

const boardDetailRoute = readRoute('app/api/boards/[id]/route.ts');
const boardViewRoute = readRoute('app/api/boards/[id]/view/route.ts');
const communityViewRoute = readRoute('app/api/community/posts/[id]/view/route.ts');
const postReportRoute = readRoute('app/api/community/posts/[id]/report/route.ts');
const commentReportRoute = readRoute('app/api/community/comments/[id]/report/route.ts');
const adminReportListRoute = readRoute('app/api/admin/community/reports/route.ts');
const adminReportStatusRoute = readRoute('app/api/admin/community/reports/[id]/status/route.ts');

// -----------------------------------------------------------------------------
// 1) 권한 시나리오 계약(비회원/회원/작성자/관리자): 읽기·수정·삭제·비밀글 접근
// -----------------------------------------------------------------------------
test('게시글 권한 계약: 읽기(GET)에서 비밀글은 비회원 401, 비작성자 회원 403으로 분기한다', () => {
  assert.match(boardDetailRoute, /if \(post\.isSecret\)/);
  assert.match(boardDetailRoute, /error:\s*\{ code: 'unauthorized', message: 'Unauthorized' \}/);
  assert.match(boardDetailRoute, /status:\s*401/);
  assert.match(boardDetailRoute, /error:\s*\{ code: 'forbidden', message: 'Forbidden' \}/);
  assert.match(boardDetailRoute, /status:\s*403/);
});

test('게시글 권한 계약: 수정(PATCH)은 비회원 401, 작성자/관리자 외 403을 강제한다', () => {
  assert.match(boardDetailRoute, /export async function PATCH/);
  assert.match(boardDetailRoute, /if \(!payload\)/);
  assert.match(boardDetailRoute, /boards:patch:unauthorized/);
  assert.match(boardDetailRoute, /boards:patch:forbidden/);
  assert.match(boardDetailRoute, /if \(!canEdit\(\{ viewerId: String\(payload\?\.sub \|\| ''\), isAdmin \}, post\)\)/);
});

test('게시글 권한 계약: 삭제(DELETE)는 비회원 401, 작성자 아니면 관리자 검증을 요구한다', () => {
  assert.match(boardDetailRoute, /export async function DELETE/);
  assert.match(boardDetailRoute, /boards:delete:unauthorized/);
  assert.match(boardDetailRoute, /if \(!isOwner\) \{\s*const guard = await requireAdmin\(req\);/s);
});

// -----------------------------------------------------------------------------
// 2) 조회수 dedupe 계약(로그인/비로그인)
// -----------------------------------------------------------------------------
test('조회수 dedupe 계약: board view는 로그인/비로그인 각각 viewerKey를 생성해 1회만 카운트한다', () => {
  assert.match(boardViewRoute, /viewerKey = `u:\$\{String\(payload\.sub\)\}`/);
  assert.match(boardViewRoute, /viewerKey = `ipua:\$\{getIpUaHash\(req\)\}`/);
  assert.match(boardViewRoute, /BoardRepo\.tryAcquireViewSlot\(db, id, viewerKey\)/);
  assert.match(boardViewRoute, /firstView: acquired/);
});

test('조회수 dedupe 계약: community view는 로그인/비로그인 모두 동일 dedupe 컬렉션 정책을 사용한다', () => {
  assert.match(communityViewRoute, /community_post_view_dedupe/);
  assert.match(communityViewRoute, /const viewerKey = \(\(\) => \{/);
  assert.match(communityViewRoute, /if \(userId\) return `u:\$\{String\(userId\)\}`;/);
  assert.match(communityViewRoute, /const anonId = cookieStore\.get\(COMMUNITY_ANON_VIEWER_COOKIE\)\?\.value;/);
  assert.match(communityViewRoute, /firstView: acquired/);
});

// -----------------------------------------------------------------------------
// 3) 신고 중복 제한 계약
// -----------------------------------------------------------------------------
test('신고 중복 제한 계약: 게시글 신고는 동일 사용자의 5분 내 중복 신고를 429로 제한한다', () => {
  assert.match(postReportRoute, /const fiveMinutesAgo = new Date\(now\.getTime\(\) - 5 \* 60 \* 1000\);/);
  assert.match(postReportRoute, /reporterUserId: reporter\.reporterUserId/);
  assert.match(postReportRoute, /createdAt: \{ \$gte: fiveMinutesAgo \}/);
  assert.match(postReportRoute, /error: 'too_many_requests'/);
  assert.match(postReportRoute, /status: 429/);
});

test('신고 중복 제한 계약: 댓글 신고도 동일 사용자의 5분 내 중복 신고를 429로 제한한다', () => {
  assert.match(commentReportRoute, /const fiveMinutesAgo = new Date\(now\.getTime\(\) - 5 \* 60 \* 1000\);/);
  assert.match(commentReportRoute, /reporterUserId: reporter\.reporterUserId/);
  assert.match(commentReportRoute, /createdAt: \{ \$gte: fiveMinutesAgo \}/);
  assert.match(commentReportRoute, /error: 'too_many_requests'/);
  assert.match(commentReportRoute, /status: 429/);
});

// -----------------------------------------------------------------------------
// 4) 관리자 상태 변경 반영 계약
// -----------------------------------------------------------------------------
test('관리자 상태 변경 계약: resolve_hide_target은 대상 업데이트 결과를 검사하고 실패 시 report 상태를 보존한다', () => {
  assert.match(adminReportStatusRoute, /resolve_hide_target/);
  assert.match(adminReportStatusRoute, /if \(!hideTargetResult\.ok\)/);
  assert.match(adminReportStatusRoute, /reportStatusPreserved: true/);
  assert.match(adminReportStatusRoute, /\{ status: hideTargetResult\.status \}/);
  assert.match(adminReportStatusRoute, /error: 'target_not_found' \| 'target_already_processed' \| 'target_update_failed'/);
});

test('관리자 상태 변경 계약: 댓글 삭제 시 commentsCount 하한(0)을 보장하는 파이프라인 감소를 사용한다', () => {
  assert.match(adminReportStatusRoute, /\$max: \[0, \{ \$subtract: \[\{ \$ifNull: \['\$commentsCount', 0\] \}, 1\] \}\]/);
  assert.match(adminReportStatusRoute, /commentsCount 감소는 0 미만으로 내려가지 않도록/);
});

test('관리자 상태 변경 계약: 트랜잭션 가능 환경에서는 세션 트랜잭션으로 target+report 변경을 원자적으로 처리한다', () => {
  assert.match(adminReportStatusRoute, /supportsTransactions\(db\)/);
  assert.match(adminReportStatusRoute, /const session = db\.client\.startSession\(\);/);
  assert.match(adminReportStatusRoute, /await session\.withTransaction\(async \(\) => \{/);
  assert.match(adminReportStatusRoute, /throw new TransactionBusinessError/);
});

test('관리자 상태 변경 계약: 감사 로그에 처리 관리자/행동/대상/요청 메타를 확장 저장한다', () => {
  assert.match(adminReportStatusRoute, /resolvedByAdminId: admin\._id\.toString\(\)/);
  assert.match(adminReportStatusRoute, /resolutionAction: action/);
  assert.match(adminReportStatusRoute, /moderationAudit: \{/);
  assert.match(adminReportStatusRoute, /actor: \{/);
  assert.match(adminReportStatusRoute, /target: \{/);
  assert.match(adminReportStatusRoute, /request: \{/);
});

test('관리자 상태 변경 계약: 대상 없음/이미 삭제됨(중복 처리)/업데이트 실패를 각각 409 또는 422로 구분한다', () => {
  assert.match(adminReportStatusRoute, /status: 409,\s*error: 'target_not_found'/);
  assert.match(adminReportStatusRoute, /status: 409,\s*error: 'target_already_processed'/);
  assert.match(adminReportStatusRoute, /status: 422,\s*error: 'target_update_failed'/);
});

test('관리자 상태 반영 조회 계약: 신고 목록 API는 신고/게시글/댓글의 최신 status 필드를 응답으로 노출한다', () => {
  assert.match(adminReportListRoute, /status: 1,/);
  assert.match(adminReportListRoute, /post: \{ _id: 1, title: 1, postNo: 1, status: 1 \}/);
  assert.match(adminReportListRoute, /comment: \{ _id: 1, content: 1, nickname: 1, status: 1 \}/);
  assert.match(adminReportListRoute, /status: d\.status,/);
  assert.match(adminReportListRoute, /status: d\.post\.status \?\? 'public',/);
  assert.match(adminReportListRoute, /status: d\.comment\.status \?\? 'active',/);
});
