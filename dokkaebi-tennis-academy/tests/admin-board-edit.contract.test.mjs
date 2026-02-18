import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = new URL('..', import.meta.url).pathname;

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

// 관리자 수정 클라이언트의 조회/저장 API 계약을 고정한다.
test('관리자 수정 화면은 조회/수정 모두 admin API + 공통 유틸 계약을 사용한다', () => {
  const pageSrc = read('app/admin/boards/[id]/edit/page.tsx');
  const clientSrc = read('app/admin/boards/[id]/edit/AdminBoardEditClient.tsx');

  // 페이지에서 전용 클라이언트 렌더링 계약을 유지한다.
  assert.ok(pageSrc.includes('AdminBoardEditClient'), '관리자 수정 페이지는 전용 클라이언트를 렌더링해야 합니다.');

  // 조회는 adminFetcher + 동일 경로를 사용해야 한다.
  assert.ok(clientSrc.includes('adminFetcher'), '관리자 수정 화면은 adminFetcher를 사용해야 합니다.');
  assert.ok(
    clientSrc.includes('`/api/admin/community/posts/${encodeURIComponent(postId)}`'),
    '관리자 수정 화면 조회 API는 /api/admin/community/posts/:id 경로를 사용해야 합니다.',
  );

  // 수정은 adminMutator + PATCH + 동일 경로를 사용해야 한다.
  assert.ok(clientSrc.includes('adminMutator'), '관리자 수정 화면은 adminMutator를 사용해야 합니다.');
  assert.ok(clientSrc.includes("method: 'PATCH'"), '관리자 수정 저장은 PATCH 메서드를 사용해야 합니다.');
  assert.ok(
    clientSrc.includes('`/api/admin/community/posts/${encodeURIComponent(postId)}`'),
    '관리자 수정 저장 API는 조회와 동일한 /api/admin/community/posts/:id 경로를 사용해야 합니다.',
  );

  // 조회/저장 결과는 ensureAdminMutationSucceeded로 공통 검증해야 한다.
  assert.ok(
    clientSrc.includes("ensureAdminMutationSucceeded(payload, '게시물을 불러오지 못했습니다.')"),
    '조회 응답은 ensureAdminMutationSucceeded로 검증해야 합니다.',
  );
  assert.ok(
    clientSrc.includes("ensureAdminMutationSucceeded(payload, '게시물 수정에 실패했습니다.')"),
    '수정 응답은 ensureAdminMutationSucceeded로 검증해야 합니다.',
  );
});

// 관리자 게시글 단건 API(GET/PATCH/DELETE)의 인증/보안/저장소 계약을 고정한다.
test('관리자 게시글 단건 API는 requireAdmin + CSRF + community_posts 계약을 따른다', () => {
  const src = read('app/api/admin/community/posts/[id]/route.ts');

  // GET/PATCH/DELETE 모두 requireAdmin을 통과해야 한다.
  assert.ok(src.includes('export async function GET'), '관리자 게시글 단건 API는 GET을 제공해야 합니다.');
  assert.ok(src.includes('export async function PATCH'), '관리자 게시글 단건 API는 PATCH를 제공해야 합니다.');
  assert.ok(src.includes('export async function DELETE'), '관리자 게시글 단건 API는 DELETE를 제공해야 합니다.');
  assert.ok(src.includes('requireAdmin('), 'GET/PATCH/DELETE는 requireAdmin을 사용해야 합니다.');
  assert.ok(src.includes('if (!guard.ok) return guard.res;'), 'requireAdmin 실패 시 guard.res를 즉시 반환해야 합니다.');

  // PATCH/DELETE는 verifyAdminCsrf를 강제해야 한다.
  const patchToDeleteBlock = src.slice(src.indexOf('export async function PATCH'));
  assert.ok(patchToDeleteBlock.includes('verifyAdminCsrf('), 'PATCH/DELETE는 verifyAdminCsrf를 사용해야 합니다.');

  // 저장 컬렉션은 community_posts로 고정한다.
  assert.ok(
    src.includes("collection<EditableCommunityPost>('community_posts')") || src.includes("db.collection('community_posts')"),
    '관리자 게시글 단건 API 저장소는 community_posts 컬렉션이어야 합니다.',
  );
});

// 실패 상태 코드/메시지 분기를 문자열 계약으로 고정한다.
test('관리자 게시글 단건 API는 400/404/422 실패 분기를 고정한다', () => {
  const src = read('app/api/admin/community/posts/[id]/route.ts');

  // 400: 잘못된 ObjectId
  assert.ok(src.includes("{ error: 'Invalid id' }, { status: 400 }"), '잘못된 id는 400 + Invalid id를 반환해야 합니다.');

  // 404: 대상 문서 없음
  assert.ok(src.includes("{ error: 'Not found' }, { status: 404 }"), '대상 문서가 없으면 404 + Not found를 반환해야 합니다.');

  // 422: 입력 검증 실패
  assert.ok(src.includes("{ error: '제목을 입력해 주세요.' }, { status: 422 }"), '제목 누락은 422를 반환해야 합니다.');
  assert.ok(src.includes("{ error: '내용을 입력해 주세요.' }, { status: 422 }"), '내용 누락/짧은 내용은 422를 반환해야 합니다.');
  assert.ok(src.includes("{ error: '내용은 5,000자 이하로 입력해 주세요.' }, { status: 422 }"), '내용 초과는 422를 반환해야 합니다.');
});
