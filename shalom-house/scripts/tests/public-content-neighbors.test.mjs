import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../../src");
const require = createRequire(import.meta.url);
const { ObjectId } = require("mongodb");
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const loaded = new Map();
const mocks = {
  "server-only": {},
  "@/lib/mongodb": { getMongoDatabase: async () => ({ collection: () => collection }) },
  "@/features/gallery/gallery.repository": {
    findPublicGalleryCoversByIds: async () => new Map(), findPublicGalleryCoverById: async () => null,
  },
};
let collection;

function load(path) {
  const file = [path + ".ts", path + ".tsx"].find(existsSync);
  if (loaded.has(file)) return loaded.get(file).exports;
  const entry = { exports: {} };
  loaded.set(file, entry);
  const localRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name]
    : name.endsWith(".json") ? require(resolve(dirname(file), name))
    : name.startsWith("@/") ? load(resolve(root, name.slice(2)))
    : name.startsWith(".") ? load(resolve(dirname(file), name)) : require(name);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)(localRequire, entry, entry.exports);
  return entry.exports;
}

const content = load(resolve(root, "features/content/public-content-neighbors"));
const news = load(resolve(root, "features/news/news.repository"));
const programs = load(resolve(root, "features/programs/program.repository"));
const { MongoNewsRepository } = load(resolve(root, "features/news/news.mongo-repository"));
const { MongoProgramRepository } = load(resolve(root, "features/programs/program.mongo-repository"));
const pagination = load(resolve(root, "features/news/news.pagination"));
const date = new Date("2025-01-02");
const before = new Date("2025-01-01");
const after = new Date("2025-01-03");

function row(id, publishedAt = date, overrides = {}) {
  return {
    _id: new ObjectId(id.toString(16).padStart(24, "0")), slug: `post-${id}`, title: `제목 ${id}`,
    category: "notice", publishedAt, createdAt: before, updatedAt: after,
    publicationStatus: "published", approvalStatus: "approved", summary: "요약",
    body: ["일반 본문"], purpose: "목적", operationStatusLabel: null, sortOrder: 100,
    ...overrides,
  };
}

const anchor = (doc) => ({
  id: doc._id.toHexString(), slug: doc.slug, category: doc.category, sortOrder: doc.sortOrder, publishedAt: doc.publishedAt.toISOString(),
});

function comparable(value) {
  return value instanceof ObjectId ? value.toHexString() : value instanceof Date ? value.getTime() : value;
}

function matches(row, filter) {
  return Object.entries(filter).every(([field, condition]) => {
    if (field === "$and") return condition.every((item) => matches(row, item));
    if (field === "$or") return condition.some((item) => matches(row, item));
    const actual = comparable(row[field]);
    if (condition === null) return actual == null;
    if (typeof condition !== "object" || condition instanceof Date || condition instanceof ObjectId) {
      return actual === comparable(condition);
    }
    return Object.entries(condition).every(([operator, operand]) => {
      const expected = comparable(operand);
      switch (operator) {
        case "$exists": return Object.hasOwn(row, field) === operand;
        case "$type": assert.equal(operand, "objectId"); return row[field] instanceof ObjectId;
        case "$ne": return operand === null ? actual != null : actual !== expected;
        case "$lt": return actual < expected;
        case "$lte": return actual <= expected;
        case "$gt": return actual > expected;
        case "$regex": return typeof actual === "string" && operand.test(actual);
        default: throw new Error(`모의 조회에서 지원하지 않는 연산자: ${operator}`);
      }
    });
  });
}

function project(row, projection) {
  if (!projection) return row;
  return Object.fromEntries(Object.entries(row).filter(([field]) => field === "_id" || projection[field] === 1));
}

// MongoDB 대역은 전달받은 실제 필터, 정렬, projection, skip 및 limit을 적용합니다.
function mockCollection(rows, { failOrder } = {}) {
  const calls = [];
  return {
    calls,
    async countDocuments(filter) { return rows.filter((row) => matches(row, filter)).length; },
    async findOne(filter, options) {
      const first = rows.find((row) => matches(row, filter));
      return first ? project(first, options?.projection) : null;
    },
    find(filter, options) {
      const call = { filter, options, sort: [], offset: 0, size: undefined };
      calls.push(call);
      return {
        sort(sort) { call.sort = Array.isArray(sort) ? sort : Object.entries(sort); return this; },
        skip(offset) { call.offset = offset; return this; },
        limit(size) { call.size = size; return this; },
        async toArray() {
          if (failOrder !== undefined && call.sort[0]?.[1] === failOrder) throw new Error("읽기 실패");
          return rows.filter((row) => matches(row, filter)).sort((a, b) => {
            for (const [field, order] of call.sort) {
              const av = comparable(a[field]), bv = comparable(b[field]);
              if (av !== bv) return av < bv ? -order : order;
            }
            return 0;
          }).slice(call.offset, call.size === undefined ? undefined : call.offset + call.size)
            .map((row) => project(row, options?.projection));
        },
      };
    },
  };
}

function assertNeighbors(result, next, previous) {
  for (const [direction, slug] of [["next", next], ["previous", previous]]) {
    const neighbor = result[direction];
    assert.equal(neighbor.status, slug ? "found" : "missing");
    if (slug) {
      assert.equal(neighbor.item.slug, slug);
      assert.deepEqual(Object.keys(neighbor.item), ["slug", "title", "publishedAt"]);
    }
  }
}

test("운영 사례 A: 전체 소식과 직접 접근은 카테고리를 넘어서 목록의 바로 위·아래 글을 탐색", async () => {
  const expression = row(3, date, { slug: "realistic-expression-story", category: "activity" });
  const rows = [
    row(6), row(5), row(4, date, { slug: "volunteer-guide" }), expression,
    row(2, date, { slug: "test-news-01" }), row(1, date, { slug: "test-news-02", category: "activity" }),
  ];
  collection = mockCollection(rows);
  const repo = new MongoNewsRepository();
  const { items } = await repo.searchPublished();
  assert.deepEqual(items.map(({ slug }) => slug),
    ["post-6", "post-5", "volunteer-guide", expression.slug, "test-news-01", "test-news-02"]);
  for (const [index, post] of items.entries()) {
    assertNeighbors(await repo.findPublishedNeighbors(post, pagination.getPublicNewsNeighborScope("/news")),
      items[index - 1]?.slug, items[index + 1]?.slug);
  }
  assertNeighbors(await repo.findPublishedNeighbors(anchor(expression)), "volunteer-guide", "test-news-01");
});

test("공지·활동·카테고리·제목 및 요약 검색 범위가 페이지 경계를 넘어 목록과 일치", async () => {
  const candidates = [
    row(8, date, { title: "키.워드" }),
    row(7, date, { title: "키X워드" }),
    row(6, date, { title: "키.워드", category: "activity" }),
    row(5, date, { summary: "키.워드 포함" }),
    row(4, date, { title: "키.워드", category: "activity" }),
  ];
  const scopes = [
    ["/news/notices?category=activity", ["post-8", "post-7", "post-5"]],
    ["/news/activities?category=notice", ["post-6", "post-4"]],
    ["/news?category=notice", ["post-8", "post-7", "post-5"]],
    ["/news?category=activity", ["post-6", "post-4"]],
    ["/news?q=키.워드&category=notice&page=2", ["post-8", "post-5"]],
    ["/news/activities?q=키.워드", ["post-6", "post-4"]],
  ];
  for (const [href, expected] of scopes) {
    collection = mockCollection(candidates);
    const repo = new MongoNewsRepository();
    const scope = pagination.getPublicNewsNeighborScope(href);
    const { items } = await repo.searchPublished(scope);
    assert.deepEqual(items.map(({ slug }) => slug), expected);
    for (const [index, post] of items.entries()) {
      const page = await repo.searchPublished({ ...scope, pageSize: 1, page: index + 1 });
      assert.equal(page.items[0].slug, post.slug);
      assertNeighbors(await repo.findPublishedNeighbors(post, scope), expected[index - 1], expected[index + 1]);
    }
  }
  const repo = new MongoNewsRepository();
  assert.deepEqual(await repo.findPublishedNeighbors(anchor(candidates[2]), { category: "notice" }), content.unavailableContentNeighbors);
  assert.deepEqual(await repo.findPublishedNeighbors(anchor(candidates[1]), { q: "키.워드" }), content.unavailableContentNeighbors);
  collection = mockCollection([candidates[0]]);
  assertNeighbors(await repo.findPublishedNeighbors(anchor(candidates[0])), null, null);
});

test("비공개·휴지통·미승인·미래·본문 불량을 제외하고 기존 일반 본문 fallback 후보를 연결", async () => {
  const current = row(1);
  const invalid = Array.from({ length: 17 }, (_, index) => row(index + 2, date, { body: [null] }));
  collection = mockCollection([
    current, ...invalid, row(20, date, { publicationStatus: "draft" }),
    row(21, date, { publicationStatus: "archived" }), row(22, date, { approvalStatus: "pending" }),
    row(23, date, { deletedAt: date }), row(24, date, { bodyDocument: { version: 99 } }),
    row(25, new Date("9999-01-01")),
  ]);
  const repo = new MongoNewsRepository();
  const result = await repo.findPublishedNeighbors(anchor(current));
  assertNeighbors(result, "post-24", null);
  assert.deepEqual((await repo.findPublishedBySlug("post-24")).body, ["일반 본문"]);
  const ascending = collection.calls.filter(({ sort }) => sort[0]?.[1] === 1);
  assert.equal(ascending.length, 2);
  assert.equal(ascending[1].filter.$and[1].$or[1]._id.$gt.toHexString(), row(17)._id.toHexString());
});

test("운영 사례 B: 프로그램 목록의 혼합 정렬과 중복 제목을 slug로 대조", async () => {
  const rows = [
    row(2, before, { slug: "meal-first", title: "함께 준비하는 한 끼", category: "생활", sortOrder: 1 }),
    row(4, after, { slug: "meal-with-image", title: "함께 준비하는 한 끼", category: "생활", sortOrder: 2 }),
    row(3, after, { slug: "realistic-creative-expression", category: "여가", sortOrder: 2, bodyDocument: { version: 99 } }),
    row(8, date, { slug: "neighborhood", category: "지역", sortOrder: 2 }),
    row(5, after, { category: "생활", sortOrder: 3 }),
  ];
  collection = mockCollection(rows);
  const repo = new MongoProgramRepository();
  const list = await repo.listPublished({ limit: 100 });
  const expected = ["meal-first", "meal-with-image", "realistic-creative-expression", "neighborhood", "post-5"];
  assert.deepEqual(list.map(({ slug }) => slug), expected);
  for (const [index, post] of list.entries()) {
    assertNeighbors(await repo.findPublishedNeighbors(post), expected[index - 1], expected[index + 1]);
  }
  assert.deepEqual((await repo.findPublishedBySlug("realistic-creative-expression")).body, ["일반 본문"]);
});

test("프로그램의 원본 목록 상위 100건 경계와 상세 유효성 검사 유지", async () => {
  const rows = Array.from({ length: 101 }, (_, index) =>
    row(index + 1, date, { sortOrder: index, ...(index === 98 ? { body: [] } : {}) }));
  collection = mockCollection(rows);
  const repo = new MongoProgramRepository();
  assert.equal((await repo.listPublished({ limit: 100 })).at(-1).slug, "post-100");
  assertNeighbors(await repo.findPublishedNeighbors(anchor(rows[99])), "post-98", null);
  assert.deepEqual(await repo.findPublishedNeighbors(anchor(rows[100])), content.unavailableContentNeighbors);
});

test("조회 한도 및 한쪽 조회 실패를 실제 부재와 구분", async () => {
  const current = row(1);
  collection = mockCollection(Array.from({ length: 65 }, (_, index) => row(index + 2, date, { title: "" })));
  const repo = new MongoNewsRepository();
  const limited = await repo.findPublishedNeighbors(anchor(current));
  assert.equal(limited.next.status, "unavailable");
  assert.equal(limited.previous.status, "missing");
  assert.equal(collection.calls.filter(({ sort }) => sort[0]?.[1] === 1).length, 4);
  collection = mockCollection([row(400, before)], { failOrder: 1 });
  const failure = await repo.findPublishedNeighbors(anchor(current));
  assert.equal(failure.next.status, "unavailable");
  assert.equal(failure.previous.item.slug, "post-400");
});

test("returnTo 검색·카테고리·페이지를 전달하고 외부·관리자 경로 차단", () => {
  for (const value of ["/news?q=검색&category=notice&page=3", "/news/notices?q=검색&page=2", "/news/activities?page=4"]) {
    let next = pagination.getPublicNewsNeighborHref("post-2", value);
    next = pagination.getPublicNewsNeighborHref("post-3", new URL(next, "https://example.org").searchParams.get("returnTo"));
    assert.equal(new URL(next, "https://example.org").searchParams.get("returnTo"), pagination.getPublicNewsReturnHref(value));
  }
  for (const unsafe of ["/admin/news", "//outside.example/news", "https://outside.example/news"]) {
    assert.equal(pagination.getPublicNewsNeighborHref("post-2", unsafe), "/news/post-2?returnTo=%2Fnews");
  }
});

test("fixture 및 empty 조회에서 기존 소스와 카테고리 계약 사용", async (t) => {
  const source = process.env.SHALOM_CONTENT_SOURCE;
  try {
    process.env.SHALOM_CONTENT_SOURCE = "fixture";
    const fixture = news.getNewsRepository();
    const [item] = await fixture.listPublished({ limit: 1 });
    const neighbors = await fixture.findPublishedNeighbors(item, { category: item.category });
    assert.equal(neighbors.previous.status, "found");
    assert.equal((await fixture.findPublishedBySlug(neighbors.previous.item.slug)).category, item.category);
    process.env.SHALOM_CONTENT_SOURCE = "empty";
    assert.deepEqual(await news.getNewsRepository().findPublishedNeighbors(item), content.noContentNeighbors);
    assert.deepEqual(await programs.getProgramRepository().findPublishedNeighbors(item), content.noContentNeighbors);
    t.mock.method(load(resolve(root, "content/fixtures/visual.fixture")), "isVisualFixtureEnabled", () => true);
    const visual = programs.getProgramRepository();
    const current = await visual.findPublishedBySlug("fixture-program-media");
    assert.equal((await visual.findPublishedNeighbors(current)).previous.item.slug, "fixture-program-text");
  } finally {
    if (source === undefined) delete process.env.SHALOM_CONTENT_SOURCE;
    else process.env.SHALOM_CONTENT_SOURCE = source;
  }
});

test("실제 상세가 검증된 목록 범위를 전달하고 조회 실패에도 본문과 복귀를 유지", async () => {
  const scopes = [];
  const { body, summary, title } = row(1);
  const post = { ...anchor(row(1)), body, summary, title, updatedAt: after.toISOString() };
  Object.assign(mocks, {
    "next/link": ({ children, href }) => createElement("a", { href }, children),
    "next/image": () => null,
    "next/navigation": { notFound: () => { throw new Error("not found"); } },
    "@/components/news/news-rich-body": {},
    "@/features/news/news.repository": { getNewsRepository: () => ({
      findPublishedBySlug: async () => post,
      findPublishedNeighbors: async (current, options) => {
        assert.equal(current.slug, post.slug);
        scopes.push(options);
        throw new Error("인접 조회 실패");
      },
    }) },
    "@/features/seo/json-ld": { JsonLd: () => null },
    "@/features/seo/metadata": {},
    "@/features/seo/site-url": { createAbsolutePublicUrl: (path) => path, getSiteOrigin: () => "https://example.org" },
  });
  const detail = load(resolve(root, "app/(public)/news/[slug]/page")).default;
  const rendered = renderToStaticMarkup(await detail({
    params: Promise.resolve({ slug: post.slug }), searchParams: Promise.resolve({ returnTo: "/news/notices?q=%ED%99%95%EC%9D%B8&category=activity&page=3" }),
  }));
  assert.match(rendered, /일반 본문/);
  assert.match(rendered, /이동할 글을 확인하지 못했습니다/);
  assert.deepEqual(scopes, [{ q: "확인", category: "notice" }]);
  assert.match(rendered, /href="\/news\/notices\?q=%ED%99%95%EC%9D%B8&amp;page=3"/);
  assert.doesNotMatch(rendered, /이동할 글이 없습니다|관련 소식/);
});
