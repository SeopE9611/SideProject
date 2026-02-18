import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminBoardDetailUrl, buildBoardPublicUrl } from '../lib/board-public-url-policy.js';

test('buildBoardPublicUrl: postNo 기반 공개 URL을 정상 생성한다', () => {
  const result = buildBoardPublicUrl({ type: 'notice', postNo: 42, status: 'public' });

  assert.deepEqual(result, {
    ok: true,
    url: '/board/notice/42',
    policyType: 'notice',
  });
});

test('buildBoardPublicUrl: postNo가 null이면 missing_identifier를 반환한다', () => {
  const result = buildBoardPublicUrl({ type: 'notice', postNo: null, status: 'public' });

  assert.deepEqual(result, {
    ok: false,
    reason: 'missing_identifier',
  });
});

test('buildBoardPublicUrl: 타입-라우트 매핑 누락 시 missing_type_route를 반환한다', () => {
  const result = buildBoardPublicUrl({ type: 'unknown-board', postNo: 10, status: 'public' });

  assert.deepEqual(result, {
    ok: false,
    reason: 'missing_type_route',
  });
});


test('buildBoardPublicUrl: brand 타입은 /board/brands 경로로 공개 URL을 생성한다', () => {
  const result = buildBoardPublicUrl({ type: 'brand', postNo: 77, status: 'public' });

  assert.deepEqual(result, {
    ok: true,
    url: '/board/brands/77',
    policyType: 'brand',
  });
});

test('buildBoardPublicUrl: 레거시 brands 입력은 brand로 정규화한다', () => {
  const result = buildBoardPublicUrl({ type: 'brands', postNo: 78, status: 'public' });

  assert.deepEqual(result, {
    ok: true,
    url: '/board/brands/78',
    policyType: 'brand',
  });
});

test('buildBoardPublicUrl: hidden/private 상태는 공개 링크를 차단한다', () => {
  const hiddenResult = buildBoardPublicUrl({ type: 'qna', postNo: 9, status: 'hidden' });
  const privateResult = buildBoardPublicUrl({ type: 'qna', postNo: 9, status: 'private' });

  assert.deepEqual(hiddenResult, { ok: false, reason: 'private_post' });
  assert.deepEqual(privateResult, { ok: false, reason: 'private_post' });
});

test('buildAdminBoardDetailUrl: id가 유효할 때만 관리자 상세 fallback URL을 생성한다', () => {
  assert.equal(buildAdminBoardDetailUrl({ id: 'abc123' }), '/admin/boards/abc123');
  assert.equal(buildAdminBoardDetailUrl({ id: '   ' }), null);
  assert.equal(buildAdminBoardDetailUrl({ id: null }), null);
});

test('buildAdminBoardDetailUrl: 공백/슬래시/한글 식별자를 URL-safe 형태로 인코딩한다', () => {
  assert.equal(buildAdminBoardDetailUrl({ id: 'A B' }), '/admin/boards/A%20B');
  assert.equal(buildAdminBoardDetailUrl({ id: 'group/42' }), '/admin/boards/group%2F42');
  assert.equal(buildAdminBoardDetailUrl({ id: '공지사항/테스트 글' }), '/admin/boards/%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD%2F%ED%85%8C%EC%8A%A4%ED%8A%B8%20%EA%B8%80');
});
