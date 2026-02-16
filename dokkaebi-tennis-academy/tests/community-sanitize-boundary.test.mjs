import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('커뮤니티 작성/수정 API는 본문을 sanitize 후 길이를 검증한다', () => {
  const postCreate = read('app/api/community/posts/route.ts');
  assert.ok(postCreate.includes('sanitizeHtml(body.content)'));
  assert.ok(postCreate.includes('validateSanitizedLength(sanitizedContent, { min: 1, max: 5000 })'));
  assert.ok(postCreate.includes('content: sanitizedContent'));
  assert.ok(postCreate.indexOf('sanitizeHtml(body.content)') < postCreate.indexOf('validateSanitizedLength(sanitizedContent, { min: 1, max: 5000 })'));

  const postPatch = read('app/api/community/posts/[id]/route.ts');
  assert.ok(postPatch.includes('sanitizeHtml(body.content)'));
  assert.ok(postPatch.includes('validateSanitizedLength(sanitizedContent, { min: 1, max: 5000 })'));
  assert.ok(postPatch.includes('update.content = sanitizedContent'));
  assert.ok(postPatch.indexOf('sanitizeHtml(body.content)') < postPatch.indexOf('validateSanitizedLength(sanitizedContent, { min: 1, max: 5000 })'));
});

test('커뮤니티 댓글 작성/수정 API는 본문을 sanitize 후 길이를 검증한다', () => {
  const commentCreate = read('app/api/community/posts/[id]/comments/route.ts');
  assert.ok(commentCreate.includes('sanitizeHtml(body.content)'));
  assert.ok(commentCreate.includes('validateSanitizedLength(sanitizedContent, { min: 1, max: 1000 })'));
  assert.ok(commentCreate.includes('content: sanitizedContent'));
  assert.ok(commentCreate.indexOf('sanitizeHtml(body.content)') < commentCreate.indexOf('validateSanitizedLength(sanitizedContent, { min: 1, max: 1000 })'));

  const commentPatch = read('app/api/community/comments/[id]/route.ts');
  assert.ok(commentPatch.includes('sanitizeHtml(parsed.data.content)'));
  assert.ok(commentPatch.includes('validateSanitizedLength(sanitizedContent, { min: 1, max: 1000 })'));
  assert.ok(commentPatch.includes('content: sanitizedContent'));
  assert.ok(commentPatch.indexOf('sanitizeHtml(parsed.data.content)') < commentPatch.indexOf('validateSanitizedLength(sanitizedContent, { min: 1, max: 1000 })'));
});

test('관리자 게시글 상세는 sanitize 신뢰 경계를 문서화한다', () => {
  const adminDetail = read('app/admin/boards/[id]/page.tsx');
  assert.ok(adminDetail.includes('sanitize 신뢰 경계(trust boundary):'));
  assert.ok(adminDetail.includes('dangerouslySetInnerHTML={{ __html: post.content }}'));
});
