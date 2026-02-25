import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('community-list-query 유틸은 BoardListClient 쿼리 키 전부를 Mongo 필터/정렬로 반영한다', () => {
  const source = read('lib/community-list-query.ts');

  // sort: 최신/조회/추천/hot 분기 정렬 계약
  assert.ok(source.includes("case 'views':"));
  assert.ok(source.includes("case 'likes':"));
  assert.ok(source.includes("case 'hot':"));

  // searchType + q: title/author/title_content 반영 계약
  assert.ok(source.includes("if (query.searchType === 'title')"));
  assert.ok(source.includes("filter.title = regex;"));
  assert.ok(source.includes("} else if (query.searchType === 'author')"));
  assert.ok(source.includes("filter.nickname = regex;"));
  assert.ok(source.includes('filter.$or = [{ title: regex }, { content: regex }];'));

  // authorId, brand, category 반영 계약
  assert.ok(source.includes('if (query.authorObjectId)'));
  assert.ok(source.includes('filter.userId = query.authorObjectId;'));
  assert.ok(source.includes('if (query.brand)'));
  assert.ok(source.includes('filter.brand = query.brand;'));
  assert.ok(source.includes('if (query.category)'));
  assert.ok(source.includes('filter.category = query.category;'));
});

test('boards/community API는 동일한 공통 쿼리 파서/필터를 사용한다', () => {
  const boardsRoute = read('app/api/boards/route.ts');
  const communityRoute = read('app/api/community/posts/route.ts');

  // 공통 파서/필터 유틸 사용 계약
  assert.ok(boardsRoute.includes('parseCommunityListQuery(req'));
  assert.ok(boardsRoute.includes('buildCommunityListMongoFilter({'));
  assert.ok(communityRoute.includes('parseCommunityListQuery(req)'));
  assert.ok(communityRoute.includes('buildCommunityListMongoFilter({'));

  // kind 파싱은 허용 타입만 통과하고 그 외 입력은 null로 정규화
  assert.ok(boardsRoute.includes("const COMMUNITY_KIND_VALUES = ['free', 'market', 'gear', 'brand'] as const;"));
  assert.ok(boardsRoute.includes('function parseCommunityKindParam(value: string | null): CommunityKindParam | null'));
  assert.ok(boardsRoute.includes('return isCommunityKindParam(value) ? value : null;'));

  // boards route에는 파싱 항목 vs 반영 항목 표 문서화를 강제
  assert.ok(boardsRoute.includes('communityKind 분기의 쿼리 파싱/반영 계약표'));
  assert.ok(boardsRoute.includes('| sort | sort | find().sort(getCommunitySortOption(sort)) |'));
  assert.ok(boardsRoute.includes('| searchType | searchType | buildCommunityListMongoFilter 내부 title/nickname/$or 분기 |'));
  assert.ok(boardsRoute.includes('| authorId | authorObjectId (ObjectId 유효성 검사 포함) | buildCommunityListMongoFilter 내부 userId 필터 |'));
  assert.ok(boardsRoute.includes('| brand | brand | buildCommunityListMongoFilter 내부 brand 필터 |'));
  assert.ok(boardsRoute.includes('| category | category (허용 카테고리만 통과) | buildCommunityListMongoFilter 내부 category 필터 |'));
  assert.ok(boardsRoute.includes('| q | q + escapedQ | buildCommunityListMongoFilter 내부 검색 regex 필터 |'));
});
