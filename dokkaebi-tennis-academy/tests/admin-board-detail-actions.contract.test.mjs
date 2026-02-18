import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = new URL('..', import.meta.url).pathname;

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

test('관리자 게시글 상세 액션은 adminMutator + 공통 에러 매핑으로 공개/숨김/삭제를 처리한다', () => {
  const src = read('app/admin/boards/[id]/BoardDetailActions.tsx');

  assert.ok(src.includes('adminMutator'), 'BoardDetailActions는 adminMutator를 사용해야 합니다.');
  assert.ok(src.includes('getAdminErrorMessage'), 'BoardDetailActions는 getAdminErrorMessage를 사용해야 합니다.');

  assert.ok(
    src.includes('/api/admin/community/posts/${encodeURIComponent(postId)}/status'),
    '공개/숨김 액션은 /api/admin/community/posts/:id/status 엔드포인트를 사용해야 합니다.',
  );
  assert.ok(
    src.includes("runStatusChange = async (nextStatus: 'public' | 'hidden')"),
    '공개/숨김 상태 전이는 public/hidden 계약을 따라야 합니다.',
  );
  assert.ok(
    src.includes("method: 'PATCH'"),
    '공개/숨김 액션은 PATCH 메서드를 사용해야 합니다.',
  );

  assert.ok(
    src.includes('/api/admin/community/posts/${encodeURIComponent(postId)}'),
    '삭제 액션은 관리자 전용 게시글 삭제 엔드포인트를 사용해야 합니다.',
  );
  assert.ok(
    src.includes("method: 'DELETE'"),
    '삭제 액션은 DELETE 메서드를 사용해야 합니다.',
  );

  assert.ok(!src.includes('/api/boards/'), 'BoardDetailActions에서 일반 게시판 API(/api/boards/*)를 직접 호출하면 안 됩니다.');
  assert.ok(!src.includes('!res.ok'), '개별 res.ok 분기 대신 adminMutator 에러 처리 계약을 사용해야 합니다.');
});

test('관리자 게시글 삭제 엔드포인트는 requireAdmin + CSRF 계약을 따른다', () => {
  const src = read('app/api/admin/community/posts/[id]/route.ts');

  assert.ok(src.includes('requireAdmin('), '관리자 삭제 API는 requireAdmin 가드를 사용해야 합니다.');
  assert.ok(src.includes('if (!guard.ok) return guard.res;'), 'requireAdmin 실패 응답을 즉시 반환해야 합니다.');
  assert.ok(src.includes('verifyAdminCsrf('), '관리자 삭제 API는 CSRF 검증을 포함해야 합니다.');
  assert.ok(src.includes("export async function DELETE"), '관리자 삭제 API는 DELETE 메서드를 제공해야 합니다.');
  assert.ok(src.includes("db.collection('community_posts')"), '삭제 대상은 community_posts 컬렉션이어야 합니다.');
  assert.ok(src.includes('deleteOne'), '단건 삭제 계약(deleteOne)을 따라야 합니다.');
});
