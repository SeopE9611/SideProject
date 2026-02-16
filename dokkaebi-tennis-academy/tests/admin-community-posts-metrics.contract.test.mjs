import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('관리자 커뮤니티 게시글 API는 views/likes를 기준으로 정렬/프로젝션/응답 계약을 유지한다', () => {
  const source = read('app/api/admin/community/posts/route.ts');

  assert.ok(source.includes('views: { views: dir, viewCount: dir }'));
  assert.ok(source.includes('likes: { likes: dir, likeCount: dir }'));

  assert.ok(source.includes('views: 1'));
  assert.ok(source.includes('likes: 1'));

  assert.ok(source.includes('const views = d.views ?? d.viewCount ?? 0;'));
  assert.ok(source.includes('const likes = d.likes ?? d.likeCount ?? 0;'));
  assert.ok(source.includes('views,'));
  assert.ok(source.includes('likes,'));

  // 하위 호환 alias 유지 계약
  assert.ok(source.includes('viewCount: views'));
  assert.ok(source.includes('likeCount: likes'));
  assert.ok(source.includes('TODO(community-admin-api): 하위 호환 alias. 클라이언트 전환 완료 이후 제거.'));
});
