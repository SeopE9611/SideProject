import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildBoardPublicUrl } from '../lib/board-public-url-policy.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('관리자 게시판 목록 계약: boardLabel은 brand 키를 표준으로 사용한다', () => {
  const source = read('app/admin/boards/BoardsClient.tsx');

  assert.ok(source.includes("brand: '브랜드'"), 'boardLabel은 brand 키를 포함해야 합니다.');
  assert.ok(!source.includes("brands: '브랜드'"), 'boardLabel에서 brands 키는 제거되어야 합니다.');
});

test('관리자 게시판 목록 계약: 레거시 brands 데이터는 별칭으로 라벨 배지에 매핑된다', () => {
  const source = read('app/admin/boards/BoardsClient.tsx');

  assert.ok(source.includes('const legacyBoardTypeAlias: Record<string, string> = {'));
  assert.ok(source.includes("brands: 'brand'"), '레거시 brands -> brand 별칭이 필요합니다.');
  assert.ok(source.includes('resolveBoardLabel(p.type)'), '게시글 타입 배지는 정규화 라벨 함수를 사용해야 합니다.');
  assert.ok(source.includes('resolveBoardLabel(r.boardType)'), '신고 목록 타입 배지도 정규화 라벨 함수를 사용해야 합니다.');
});

test('관리자 게시판 목록 계약: 외부 링크 생성은 brand/brands 입력 모두 지원한다', () => {
  const brand = buildBoardPublicUrl({ type: 'brand', postNo: 11, status: 'public' });
  const brands = buildBoardPublicUrl({ type: 'brands', postNo: 12, status: 'public' });

  assert.deepEqual(brand, {
    ok: true,
    url: '/board/brands/11',
    policyType: 'brand',
  });

  assert.deepEqual(brands, {
    ok: true,
    url: '/board/brands/12',
    policyType: 'brand',
  });
});
