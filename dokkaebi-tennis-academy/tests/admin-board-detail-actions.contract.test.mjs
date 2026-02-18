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

  assert.ok(src.includes('/admin/boards/${postId}/edit'), '수정 버튼은 관리자 전용 /admin/boards/:id/edit 라우트로 이동해야 합니다.');

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

test('관리자 게시글 CRUD 엔드포인트는 requireAdmin + CSRF + community_posts 계약을 따른다', () => {
  const src = read('app/api/admin/community/posts/[id]/route.ts');

  assert.ok(src.includes('requireAdmin('), '관리자 게시글 API는 requireAdmin 가드를 사용해야 합니다.');
  assert.ok(src.includes('if (!guard.ok) return guard.res;'), 'requireAdmin 실패 응답을 즉시 반환해야 합니다.');
  assert.ok(src.includes("export async function GET"), '관리자 게시글 수정 플로우는 GET 조회 엔드포인트를 제공해야 합니다.');
  assert.ok(src.includes("export async function PATCH"), '관리자 게시글 수정 플로우는 PATCH 수정 엔드포인트를 제공해야 합니다.');
  assert.ok(src.includes("verifyAdminCsrf("), '관리자 수정/삭제 API는 CSRF 검증을 포함해야 합니다.');
  assert.ok(src.includes("export async function DELETE"), '관리자 삭제 API는 DELETE 메서드를 제공해야 합니다.');
  assert.ok(src.includes("db.collection('community_posts')") || src.includes("collection<EditableCommunityPost>('community_posts')"), '대상 데이터소스는 community_posts 컬렉션이어야 합니다.');
  assert.ok(src.includes('findOneAndUpdate'), '수정 계약은 단건 수정(findOneAndUpdate)을 따라야 합니다.');
  assert.ok(src.includes('deleteOne'), '삭제 계약은 단건 삭제(deleteOne)을 따라야 합니다.');
});

test('관리자 수정 화면은 관리자 API 기반 수정 플로우를 사용한다', () => {
  const pageSrc = read('app/admin/boards/[id]/edit/page.tsx');
  const clientSrc = read('app/admin/boards/[id]/edit/AdminBoardEditClient.tsx');

  assert.ok(pageSrc.includes('AdminBoardEditClient'), '관리자 수정 페이지는 전용 클라이언트를 렌더링해야 합니다.');
  assert.ok(clientSrc.includes('adminFetcher'), '관리자 수정 화면은 관리자 조회 API(adminFetcher)를 사용해야 합니다.');
  assert.ok(clientSrc.includes('adminMutator'), '관리자 수정 화면은 관리자 수정 API(adminMutator)를 사용해야 합니다.');
  assert.ok(clientSrc.includes('/api/admin/community/posts/${encodeURIComponent(postId)}'), '관리자 수정 화면은 /api/admin/community/posts/:id 엔드포인트를 사용해야 합니다.');
  assert.ok(clientSrc.includes("method: 'PATCH'"), '관리자 수정 저장은 PATCH 메서드를 사용해야 합니다.');
});


test('관리자 상세 페이지/상세 API는 목록과 동일한 community_posts 스키마를 사용한다', () => {
  const pageSrc = read('app/admin/boards/[id]/page.tsx');
  const detailApiSrc = read('app/api/admin/community/posts/[id]/route.ts');
  const listApiSrc = read('app/api/admin/community/posts/route.ts');

  assert.ok(
    pageSrc.includes('/api/admin/community/posts/${encodeURIComponent(boardId)}'),
    '관리자 상세 페이지는 관리자 전용 상세 API를 호출해야 합니다.',
  );
  assert.ok(!pageSrc.includes('/api/boards/'), '관리자 상세 페이지에서 일반 게시판 API(/api/boards/*)를 사용하면 안 됩니다.');

  assert.ok(detailApiSrc.includes("collection<EditableCommunityPost>('community_posts')"), '관리자 상세 API 데이터소스는 community_posts 컬렉션이어야 합니다.');

  assert.ok(detailApiSrc.includes('views: doc.views ?? 0'), '관리자 상세 API는 community_posts 조회수 필드(views)를 그대로 응답해야 합니다.');
  assert.ok(detailApiSrc.includes('commentsCount: doc.commentsCount ?? 0'), '관리자 상세 API는 community_posts 댓글수 필드(commentsCount)를 그대로 응답해야 합니다.');
  assert.ok(detailApiSrc.includes("status: doc.status ?? 'hidden'"), '관리자 상세 API는 public|hidden 상태 계약을 따라야 합니다.');

  assert.ok(listApiSrc.includes('views: d.views ?? 0') || listApiSrc.includes('views,'), '관리자 목록 API는 community_posts 조회수 필드(views)를 사용해야 합니다.');
  assert.ok(listApiSrc.includes('commentsCount: d.commentsCount ?? 0'), '관리자 목록 API는 community_posts 댓글수 필드(commentsCount)를 사용해야 합니다.');
  assert.ok(listApiSrc.includes("status: d.status ?? 'public'"), '관리자 목록 API는 public|hidden 상태 계약을 사용해야 합니다.');

  assert.ok(pageSrc.includes('post.views ?? 0'), '상세 화면은 조회수 필드명을 views로 사용해야 합니다.');
  assert.ok(pageSrc.includes('post.commentsCount ?? 0'), '상세 화면은 댓글수 필드명을 commentsCount로 사용해야 합니다.');
  assert.ok(pageSrc.includes("case 'public':"), '상세 화면 상태 라벨/색상 매핑은 public 상태를 1차 기준으로 처리해야 합니다.');
});
