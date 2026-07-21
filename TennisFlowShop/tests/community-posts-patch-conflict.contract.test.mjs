import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const routeSource = readSource("app/api/community/posts/[id]/route.ts");

const routeSourceNormalized = routeSource.replace(/"/g, "'");

const editClients = [
  {
    name: "자유게시판",
    source: readSource("app/board/free/[id]/edit/_components/FreeBoardEditClient.tsx"),
  },
  {
    name: "장비 사용기",
    source: readSource("app/board/gear/[id]/edit/_components/FreeBoardEditClient.tsx"),
  },
  {
    name: "중고거래",
    source: readSource("app/board/market/[id]/edit/_components/FreeBoardEditClient.tsx"),
  },
];

test("community PATCH는 JSON body의 clientSeenDate를 사용하고 표준 조건부 헤더에 의존하지 않는다", () => {
  assert.doesNotMatch(routeSourceNormalized, /req\.headers\.get\('if-unmodified-since'\)/);

  assert.match(routeSource, /clientSeenDateBody/);
  assert.match(routeSource, /ifUnmodifiedSinceBody/);

  assert.match(routeSource, /updatedAt:\s*clientSeenDate/);
});

test("community PATCH 매칭 실패 시 conflict(409)와 not_found(404)를 분기한다", () => {
  assert.match(routeSourceNormalized, /if \(failure === 'conflict'\)/);

  assert.match(routeSourceNormalized, /error:\s*'conflict'/);

  assert.match(routeSourceNormalized, /status:\s*409/);

  assert.match(routeSourceNormalized, /error:\s*'not_found'/);

  assert.match(routeSourceNormalized, /status:\s*404/);
});

test("커뮤니티 수정 화면은 표준 조건부 헤더를 보내지 않고 clientSeenDate를 JSON body로 전달한다", () => {
  for (const { name, source } of editClients) {
    assert.doesNotMatch(
      source,
      /If-Unmodified-Since/,
      `${name} 수정 화면에 If-Unmodified-Since 헤더가 남아 있습니다.`,
    );

    assert.match(
      source,
      /\.\.\.\(\s*clientSeenDate\s*\?\s*\{\s*clientSeenDate\s*\}\s*:\s*\{\s*\}\s*\)/s,
      `${name} 수정 payload에 clientSeenDate가 없습니다.`,
    );
  }
});

test("커뮤니티 수정 화면은 충돌 후 최신 데이터와 수정 기준값을 다시 반영한다", () => {
  for (const { name, source } of editClients) {
    assert.match(
      source,
      /const latest = await mutate\(\)/,
      `${name} 최신 글 재조회 로직이 없습니다.`,
    );

    assert.match(
      source,
      /setClientSeenDate\(nextClientSeenDate\)/,
      `${name} 최신 updatedAt 반영 로직이 없습니다.`,
    );

    assert.match(
      source,
      /baselineRef\.current\s*=\s*\{/,
      `${name} 최신 기준값 재설정 로직이 없습니다.`,
    );

    assert.match(source, /window\.confirm\(/, `${name} 현재 입력값 삭제 확인창이 없습니다.`);
  }
});

test("중고거래 수정 화면은 최신 브랜드와 거래 세부 정보를 다시 반영한다", () => {
  const marketSource = editClients.find(({ name }) => name === "중고거래")?.source;

  assert.ok(marketSource);

  assert.match(marketSource, /setBrand\(nextBrand\)/);

  assert.match(marketSource, /setMarketMeta\(nextMarketMeta\)/);

  assert.match(marketSource, /setFieldErrors\(\{\}\)/);

  assert.match(marketSource, /marketMetaJson:\s*JSON\.stringify\(nextMarketMeta\)/);
});
