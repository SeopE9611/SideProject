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
  "@/features/gallery/gallery.repository": {},
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
  id: doc._id.toHexString(), slug: doc.slug, category: doc.category, publishedAt: doc.publishedAt.toISOString(),
});

// 실제 Repository가 만든 필터·정렬·조회 제한을 MongoDB 대역에 적용합니다.
function mockCollection(rows, { failOrder } = {}) {
  const calls = [];
  return {
    calls,
    find({ $and: [visible, neighborhood] }, options) {
      const call = { visible, neighborhood, options, order: 0, size: 0 };
      calls.push(call);
      return {
        sort(sort) { call.order = sort.publishedAt; assert.equal(sort._id, call.order); return this; },
        limit(size) { call.size = size; return this; },
        async toArray() {
          if (call.order === failOrder) throw new Error("읽기 실패");
          assert.equal(visible.publicationStatus, "published");
          assert.equal(visible.approvalStatus, "approved");
          assert.deepEqual(visible.$or, [{ deletedAt: { $exists: false } }, { deletedAt: null }]);
          const [range, tie] = neighborhood.$or;
          const operator = call.order > 0 ? "$gt" : "$lt";
          const cursor = range.publishedAt[operator];
          const compare = (doc) => call.order * (doc.publishedAt - cursor ||
            doc._id.toHexString().localeCompare(tie._id[operator].toHexString()));
          return rows.filter((doc) => doc.category === neighborhood.category && doc.slug !== neighborhood.slug.$ne &&
            doc._id instanceof ObjectId && !doc._id.equals(neighborhood._id.$ne) &&
            doc.publicationStatus === visible.publicationStatus && doc.approvalStatus === visible.approvalStatus &&
            doc.deletedAt == null && doc.publishedAt <= visible.publishedAt.$lte && compare(doc) > 0)
            .sort((a, b) => call.order * (a.publishedAt - b.publishedAt ||
              a._id.toHexString().localeCompare(b._id.toHexString())))
            .slice(0, call.size);
        },
      };
    },
  };
}

test("최신·중간·최초·유일한 글과 같은 날짜 ID 경계", async () => {
  const rows = [row(1, before), row(2), row(3), row(4, after), row(9, date, { category: "activity" })];
  collection = mockCollection(rows);
  const repo = new MongoNewsRepository();
  for (const [index, previous, next] of [[0, null, 2], [1, 1, 3], [2, 2, 4], [3, 3, null], [4, null, null]]) {
    const result = await repo.findPublishedNeighbors(anchor(rows[index]));
    for (const [direction, id] of [["previous", previous], ["next", next]]) {
      assert.equal(result[direction].status, id ? "found" : "missing");
      if (id) {
        assert.equal(result[direction].item.slug, `post-${id}`);
        assert.deepEqual(Object.keys(result[direction].item), ["slug", "title", "publishedAt"]);
      }
    }
  }
});

test("현재 목록과 무관하게 여러 조회 페이지를 넘겨 유효한 후보를 찾음", async () => {
  const current = row(1);
  const invalid = Array.from({ length: 17 }, (_, index) => row(index + 2, date, { body: [null] }));
  collection = mockCollection([
    current, ...invalid, row(20, date, { publicationStatus: "draft" }),
    row(21, date, { publicationStatus: "archived" }), row(22, date, { approvalStatus: "pending" }),
    row(23, date, { deletedAt: date }), row(24, date, { category: "activity" }),
    row(25, date, { bodyDocument: { version: 99 } }), row(26),
    row(27, new Date("9999-01-01")),
  ]);
  const result = await new MongoNewsRepository().findPublishedNeighbors(anchor(current));
  assert.equal(result.next.item.slug, "post-26");
  assert.equal(result.previous.status, "missing");
  const ascending = collection.calls.filter(({ order }) => order === 1);
  assert.equal(ascending.length, 2);
  assert.equal(ascending[1].neighborhood.$or[1]._id.$gt.toHexString(), row(17)._id.toHexString());
});

test("프로그램은 카테고리가 같은 유효한 공개 글을 sortOrder와 독립적으로 선택", async () => {
  const current = row(1, date, { category: "여가", sortOrder: 99 });
  collection = mockCollection([
    row(2, after, { category: "여가", sortOrder: 0, purpose: "" }),
    row(3, after, { category: "여가", sortOrder: 500 }), row(4, after, { category: "여가", sortOrder: 1 }),
    row(5, before, { category: "생활" }), row(6, before, { category: "여가", sortOrder: 999 }),
  ]);
  const result = await new MongoProgramRepository().findPublishedNeighbors(anchor(current));
  assert.equal(result.next.item.slug, "post-3");
  assert.equal(result.previous.item.slug, "post-6");
});

test("조회 한도 및 한쪽 조회 실패를 실제 부재와 구분", async () => {
  const current = row(1);
  collection = mockCollection(Array.from({ length: 65 }, (_, index) => row(index + 2, date, { title: "" })));
  const repo = new MongoNewsRepository();
  const limited = await repo.findPublishedNeighbors(anchor(current));
  assert.equal(limited.next.status, "unavailable");
  assert.equal(limited.previous.status, "missing");
  assert.equal(collection.calls.filter(({ order }) => order === 1).length, 4);
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
    const neighbors = await fixture.findPublishedNeighbors(item);
    assert.equal(neighbors.previous.status, "found");
    assert.equal((await fixture.findPublishedBySlug(neighbors.previous.item.slug)).category, item.category);
    process.env.SHALOM_CONTENT_SOURCE = "empty";
    assert.deepEqual(await news.getNewsRepository().findPublishedNeighbors(item), content.noContentNeighbors);
    assert.deepEqual(await programs.getProgramRepository().findPublishedNeighbors(item), content.noContentNeighbors);
    t.mock.method(load(resolve(root, "content/fixtures/visual.fixture")), "isVisualFixtureEnabled", () => true);
    const visual = programs.getProgramRepository();
    const current = await visual.findPublishedBySlug("fixture-program-media");
    assert.equal((await visual.findPublishedNeighbors(current)).next.item.slug, "fixture-program-text");
  } finally {
    if (source === undefined) delete process.env.SHALOM_CONTENT_SOURCE;
    else process.env.SHALOM_CONTENT_SOURCE = source;
  }
});

test("인접 조회 실패 시 상세 본문과 목록 복귀를 렌더링", async () => {
  const { body, summary, title } = row(1);
  const post = { ...anchor(row(1)), body, summary, title, updatedAt: after.toISOString() };
  Object.assign(mocks, {
    "next/link": ({ children, href }) => createElement("a", { href }, children),
    "next/image": () => null,
    "next/navigation": { notFound: () => { throw new Error("not found"); } },
    "@/components/news/news-rich-body": {},
    "@/features/news/news.repository": { getNewsRepository: () => ({
      findPublishedBySlug: async () => post,
      findPublishedNeighbors: async () => { throw new Error("인접 조회 실패"); },
    }) },
    "@/features/seo/json-ld": { JsonLd: () => null },
    "@/features/seo/metadata": {},
    "@/features/seo/site-url": { createAbsolutePublicUrl: (path) => path, getSiteOrigin: () => "https://example.org" },
  });
  const detail = load(resolve(root, "app/(public)/news/[slug]/page")).default;
  const rendered = renderToStaticMarkup(await detail({
    params: Promise.resolve({ slug: post.slug }), searchParams: Promise.resolve({ returnTo: "/news?page=3" }),
  }));
  assert.match(rendered, /일반 본문/);
  assert.match(rendered, /이동할 글을 확인하지 못했습니다/);
  assert.match(rendered, /href="\/news\?page=3"/);
  assert.doesNotMatch(rendered, /이동할 글이 없습니다|관련 소식/);
});
