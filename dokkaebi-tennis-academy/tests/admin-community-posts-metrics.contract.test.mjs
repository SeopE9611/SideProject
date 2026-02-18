import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('관리자 커뮤니티 게시글 API는 views/likes를 기준으로 정렬/프로젝션/응답 계약을 유지한다', () => {
  const source = read('app/api/admin/community/posts/route.ts');

  assert.ok(source.includes('views: { views: dir }'));
  assert.ok(source.includes('likes: { likes: dir }'));

  assert.ok(source.includes('views: 1'));
  assert.ok(source.includes('likes: 1'));
  assert.ok(source.includes('commentsCount: 1'));

  assert.ok(source.includes('const views = d.views ?? 0;'));
  assert.ok(source.includes('const likes = d.likes ?? 0;'));
  assert.ok(source.includes('views,'));
  assert.ok(source.includes('likes,'));
  assert.ok(!source.includes('viewCount'));
  assert.ok(!source.includes('likeCount'));
});
